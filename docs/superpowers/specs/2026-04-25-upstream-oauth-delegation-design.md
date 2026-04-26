# Upstream OAuth Delegation for MetaMCP

**Date:** 2026-04-25  
**Status:** Draft  
**Scope:** Single login for MCP clients accessing upstream servers that handle their own OAuth (e.g., ms-365-mcp-server → Azure AD)

---

## Problem Statement

When an MCP client (e.g., OpenWebUI) connects to a MetaMCP endpoint that proxies an upstream MCP server with its own OAuth (e.g., ms-365-mcp-server authenticating against Azure AD), the user must authenticate **twice**:

1. To MetaMCP — via MetaMCP's own OAuth server (better-auth session)
2. To the upstream MCP server — via the upstream's IdP (Azure AD device code flow or a second OAuth popup)

This happens because MetaMCP's auth middleware intercepts the connection and presents its own OAuth challenge before the upstream ever receives the request. The upstream's 401/OAuth metadata never reaches the MCP client.

**Goal:** User authenticates once (directly with the upstream's IdP), MetaMCP is transparent for auth on these endpoints, and the upstream token is forwarded through MetaMCP to the upstream server.

---

## Key Insight: Upstream Auth IS the Protection

For endpoints where the upstream MCP server requires its own authentication (OAuth, API keys, etc.), MetaMCP adding a second layer of auth provides no meaningful security — the upstream will reject unauthenticated requests regardless. The upstream's IdP is the authority for those resources.

This is the design principle for the feature: **if the upstream handles auth, MetaMCP steps aside**.

---

## Concrete Example: ms-365-mcp-server + OpenWebUI

**ms-365-mcp-server** in HTTP mode uses `ProxyOAuthServerProvider` from the MCP SDK. It does not build its own auth server — it proxies directly to `login.microsoftonline.com`. Its `/.well-known/oauth-authorization-server` returns Azure AD's actual endpoints.

**Target flow:**

```
OpenWebUI      MetaMCP /metamcp/ms365/mcp      ms-365-mcp-server       Azure AD
    |                    |                             |                     |
    |-- POST /mcp ------>|                             |                     |
    |                    |-- proxy (no token) -------->|                     |
    |                    |<-- HTTP 401 + WWW-Auth ------|                     |
    |<-- HTTP 401 + WWW-Authenticate (bubbled up) ------|                     |
    |                    |                             |                     |
    |-- GET /.well-known/oauth-authorization-server (at MetaMCP domain) ---->|
    |   (MetaMCP fetches from upstream + mirrors)       |                     |
    |<-- { authorization_endpoint: login.microsoft.com/... } ---------------|
    |                    |                             |                     |
    |  [OpenWebUI does OAuth with Azure AD — ONE login]                      |
    |                    |                             |                     |
    |-- POST /mcp with Azure AD Bearer token ------->  |                     |
    |                    |-- proxy with Bearer -------->|                     |
    |                    |   (MetaMCP stores token      |                     |
    |                    |    per user+endpoint)        |                     |
    |                    |<-- tools response -----------|                     |
    |<-- tools response -|                             |                     |
```

---

## Design

### New Endpoint Configuration: `auth_mode`

A new field is added to the endpoint configuration:

```typescript
auth_mode: "metamcp" | "upstream_delegate" | "none"
```

| Value | Behaviour |
|---|---|
| `"metamcp"` | Current default. MetaMCP's own OAuth/API-key auth protects the endpoint. |
| `"upstream_delegate"` | MetaMCP is transparent for auth. The upstream server's OAuth is exposed directly to the MCP client. MetaMCP forwards received tokens to the upstream. |
| `"none"` | No auth on the MetaMCP endpoint. Upstream receives requests without any injected credentials. |

Existing `enable_oauth` and `enable_api_key_auth` fields continue to work for `"metamcp"` mode and remain unchanged.

---

### Component 1: OAuth Metadata Mirror

**When `auth_mode = "upstream_delegate"`**, MetaMCP must expose the upstream server's OAuth metadata at its own domain (because the MCP spec derives the authorization base URL from the MCP server's hostname — see [MCP spec: Authorization Base URL](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization#authorization-base-url)).

New endpoint:

```
GET /.well-known/oauth-authorization-server
    ?endpoint=<endpoint_name>      (optional, for per-endpoint upstream metadata)
```

**Or** — more spec-compliant — per the MCP spec the base URL is derived from the MCP server URL path, so MetaMCP can serve per-endpoint discovery at:

```
GET /metamcp/<endpoint_name>/.well-known/oauth-authorization-server
```

This endpoint:
1. Looks up the endpoint's configured upstream MCP server(s)
2. Fetches `<upstream_url>/.well-known/oauth-authorization-server`
3. Returns that metadata verbatim, **rewriting the `registration_endpoint`** to point back at MetaMCP (so MetaMCP can proxy dynamic client registration)

**Caching:** Upstream metadata is cached per endpoint with a 1-hour TTL (matching the upstream's `Cache-Control`).

**Fallback:** If the upstream does not expose `/.well-known/oauth-authorization-server`, return 404 (do not fabricate a metadata document).

---

### Component 2: Dynamic Client Registration Proxy

When the MCP client (OpenWebUI) performs dynamic client registration, it will POST to the `registration_endpoint` from the metadata document. For `upstream_delegate` mode this is rewritten to hit MetaMCP, which proxies it to the upstream.

```
POST /metamcp/<endpoint_name>/oauth/register
→ proxied to <upstream_url>/oauth/register (or the upstream's registered registration_endpoint)
```

MetaMCP does not store the registered client — it just relays. The MCP client gets back credentials issued by the upstream's actual OAuth server.

**Rationale:** The MCP client needs client credentials from the upstream IdP (Azure AD), not from MetaMCP. MetaMCP is just routing.

---

### Component 3: Auth Middleware — Delegate Mode

For endpoints with `auth_mode = "upstream_delegate"`, the `authenticateApiKey` middleware is bypassed entirely. Instead, a new `upstreamDelegateMiddleware` is applied:

1. **Extract Bearer token** from the incoming `Authorization: Bearer <token>` header.
2. **If no token present:** proxy the request to the upstream anyway. The upstream will return 401 with its `WWW-Authenticate` header. MetaMCP **passes this 401 back as-is** to the MCP client — including the `WWW-Authenticate` header. This triggers the MCP client's OAuth flow.
3. **If token present:** store the token per `(user_identity, endpoint_uuid)` in the `upstream_tokens` table (see Component 4), then inject it as `Authorization: Bearer <token>` on the proxied request to the upstream.

**User identity for token storage:** Since the endpoint has no MetaMCP auth, user identity comes from the upstream token itself. On first successful proxied call, MetaMCP attempts to extract a stable user identifier in this order:
1. Decode the JWT (if the token is a JWT) and use the `oid` or `sub` claim
2. Call the upstream's `/userinfo` endpoint (from the cached metadata's `userinfo_endpoint`) if available
3. Fall back to a SHA-256 hash of the token itself (stable for the token's lifetime, rotates on refresh)

This identifier is used as the storage key.

---

### Component 4: Upstream Token Store

New database table: `upstream_tokens`

```sql
upstream_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_uuid   uuid NOT NULL REFERENCES endpoints(uuid) ON DELETE CASCADE,
  user_identifier text NOT NULL,          -- stable ID from upstream IdP token
  access_token    text NOT NULL,          -- encrypted at rest
  refresh_token   text,                   -- encrypted at rest, nullable
  token_type      text NOT NULL DEFAULT 'Bearer',
  expires_at      timestamptz,
  scopes          text[],
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint_uuid, user_identifier)
)
```

**Encryption:** Tokens are encrypted using AES-256-GCM with a key derived from the `SECRET_KEY` environment variable (already used in MetaMCP for other secrets). Encryption/decryption happens in the repository layer, never stored plaintext.

**Token refresh:** If `expires_at` is within 5 minutes and a `refresh_token` is stored, MetaMCP automatically refreshes the token before proxying the request. The refresh uses the upstream's `token_endpoint` from the cached metadata.

**Cleanup:** Expired tokens with no refresh token are deleted by the existing cleanup job. Tokens with refresh tokens are kept until refresh fails.

---

### Component 5: Upstream 401 Propagation

The current MetaMCP proxy (`metamcp-proxy.ts`) communicates with upstream servers via the MCP SDK client, which operates at the MCP protocol layer — not the HTTP layer. A 401 from the upstream HTTP server would cause the SDK client's `connect()` to throw, not produce an HTTP 401 response that can be forwarded.

For `upstream_delegate` mode, the initial connection to the upstream (before any token is available) needs special handling:

1. When `metaMcpServerPool.getServer()` is called for a delegate-mode endpoint with no stored token, it attempts to connect to the upstream.
2. If the upstream returns HTTP 401 with `WWW-Authenticate`, the pool catches this as an auth error and returns a sentinel `AUTH_REQUIRED` status instead of a connected server.
3. The streamable HTTP / SSE transport handlers check for this sentinel and return HTTP 401 to the MCP client with the upstream's `WWW-Authenticate` header (fetched from the metadata cache).

This is the most complex part of the implementation — it requires a small amount of coupling between the transport layer and the pool to propagate auth requirements.

**Alternative (simpler — recommended):** For the initial 401 case, instead of trying to connect first, check if the endpoint is `upstream_delegate` and there is no stored token — immediately return 401 with `WWW-Authenticate` pointing to the per-endpoint metadata endpoint. This avoids the connection-then-fail cycle and is the preferred implementation path.

---

### Component 6: Per-Endpoint `/.well-known` Routing

The MCP spec states the authorization base URL is derived by stripping the path from the MCP server URL. For MetaMCP endpoints at `/metamcp/<name>/mcp`, the base URL would be the root domain — conflicting with MetaMCP's own `/.well-known` endpoints.

To handle this correctly, MetaMCP serves per-endpoint well-known URLs:

```
GET /metamcp/<endpoint_name>/.well-known/oauth-authorization-server
GET /metamcp/<endpoint_name>/.well-known/oauth-protected-resource
```

The MCP client must derive the authorization base URL as `https://metamcp.example.com/metamcp/<endpoint_name>` (not the root). The MCP SDK's `StreamableHTTPClientTransport` and `SSEClientTransport` both support this by using the MCP server URL path as the base.

**Note:** This is spec-compliant as of the 2025-03-26 spec — the base URL is derived from the MCP server URL, and path components are preserved for the well-known lookup.

---

## Data Flow Summary

### First Connection (no token)

```
MCP Client → POST /metamcp/ms365/mcp (no token)
MetaMCP: endpoint is upstream_delegate, no stored token → return 401
  WWW-Authenticate: Bearer realm="ms365", resource_metadata="/metamcp/ms365/.well-known/oauth-protected-resource"

MCP Client → GET /metamcp/ms365/.well-known/oauth-authorization-server
MetaMCP: fetch from upstream + mirror → return Azure AD metadata

MCP Client → POST /metamcp/ms365/oauth/register (dynamic client registration)
MetaMCP: proxy to upstream registration endpoint → return upstream client credentials

MCP Client → browser redirect to login.microsoftonline.com/...
User logs in to Azure AD
Browser redirected back to MCP client with auth code

MCP Client → POST upstream /token endpoint directly (Azure AD)
← Azure AD access token + refresh token

MCP Client → POST /metamcp/ms365/mcp with Bearer <azure_token>
MetaMCP: store token (user_id from JWT), proxy to upstream with same Bearer
← tools response
```

### Subsequent Connections (token stored)

```
MCP Client → POST /metamcp/ms365/mcp with Bearer <azure_token>
MetaMCP: validate token not expired, proxy with Bearer → upstream
← tools response
```

### Token Expiry + Refresh

```
MCP Client → POST /metamcp/ms365/mcp with Bearer <expired_token>
MetaMCP: token near expiry, has refresh_token → call upstream /token with refresh_token
← new access_token stored, proxied with new token
← tools response
```

---

## What MetaMCP Does NOT Do in This Design

- MetaMCP does **not** validate the upstream token's signature or claims beyond extracting a user identifier
- MetaMCP does **not** issue its own access tokens for delegate-mode endpoints
- MetaMCP does **not** implement the OAuth authorization code flow itself for delegate-mode — the MCP client handles that directly with the upstream IdP
- MetaMCP does **not** require the user to have a MetaMCP account for delegate-mode endpoints (no MetaMCP login)

---

## Database Schema Changes

1. New column on `endpoints` table: `auth_mode text NOT NULL DEFAULT 'metamcp'`
2. New table: `upstream_tokens` (see Component 4)
3. New table: `upstream_oauth_metadata_cache` (optional — or use in-memory cache with TTL)

```sql
upstream_oauth_metadata_cache (
  endpoint_uuid   uuid PRIMARY KEY REFERENCES endpoints(uuid) ON DELETE CASCADE,
  metadata        jsonb NOT NULL,
  fetched_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL
)
```

---

## API / UI Changes

### Endpoint Configuration UI

Add a new "Authentication Mode" selector to the endpoint creation/edit form:

- **MetaMCP Auth** (default) — current behavior, MetaMCP OAuth/API-key
- **Upstream Delegate** — MetaMCP transparent, upstream's IdP handles auth
- **None** — no authentication required

When "Upstream Delegate" is selected, show an info message: "MetaMCP will mirror the upstream server's OAuth metadata. Users will authenticate directly with the upstream's identity provider."

### Admin API (tRPC)

- `endpoints.create` and `endpoints.update` accept the new `auth_mode` field
- New procedure: `endpoints.getUpstreamOAuthMetadata(endpointUuid)` — returns cached upstream metadata for display/debugging in the admin UI

---

## Security Considerations

1. **Token storage:** Access and refresh tokens are encrypted at rest (AES-256-GCM). The encryption key must be set via `SECRET_KEY` env var; MetaMCP refuses to start without it when any `upstream_delegate` endpoints are configured.
2. **Token forwarding:** MetaMCP forwards the token exactly as received — it does not modify claims, scopes, or audiences. The upstream validates the token; MetaMCP trusts that validation.
3. **No MetaMCP auth on delegate endpoints:** These endpoints are intentionally unprotected at the MetaMCP layer. This is acceptable because the upstream will reject requests with invalid/missing tokens. Admins should be aware of this trade-off when configuring endpoints.
4. **Redirect URI validation:** The dynamic client registration proxy does not validate redirect URIs — it passes them to the upstream, which is responsible for validation. MetaMCP should log registration requests for auditability.
5. **SSRF risk:** The upstream OAuth metadata fetch (Component 1) could be abused if an attacker can configure an endpoint's upstream URL. Metadata fetches should respect existing URL validation rules for upstream server URLs.

---

## Out of Scope

- Supporting upstream servers that use non-OAuth authentication (API keys, basic auth) in delegate mode — these can use existing `bearerToken` or `headers` fields in server config
- Token exchange (RFC 8693) between different IdPs
- Multi-tenant scenarios where different users of the same endpoint authenticate against different tenants
- Revoking upstream tokens from MetaMCP (users can revoke directly with the upstream IdP)

---

## Open Questions

1. **Per-endpoint vs root-level `/.well-known`:** The simplest implementation serves the upstream metadata at the root `/.well-known/oauth-authorization-server` when there is exactly one delegate-mode upstream. But this breaks if multiple delegate endpoints have different upstreams. The per-endpoint path (`/metamcp/<name>/.well-known/...`) is correct but requires MCP clients to support path-aware base URL derivation. **This needs to be verified against OpenWebUI's MCP client implementation before committing to the per-endpoint path.** If OpenWebUI only strips to the root domain for `/.well-known` discovery, the per-endpoint approach will not work and a different mechanism (e.g., a query parameter or a separate subdomain per endpoint) would be needed.

2. **Token storage lifetime:** Should stored upstream tokens be tied to a MetaMCP session, or persist indefinitely (until expiry/revocation)? Persisting is more convenient but means a stolen MetaMCP DB has upstream tokens. Tying to a session requires users to re-auth when the session expires.

3. **Multiple upstream servers per namespace:** A MetaMCP namespace can aggregate multiple upstream MCP servers. If only one of them requires OAuth delegation, how does the endpoint behave? Proposal: the endpoint exposes the first `upstream_delegate` server's OAuth metadata; non-delegate servers in the namespace are proxied without credential injection.
