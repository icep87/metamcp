# Design: Per-Endpoint Header Forwarding Allowlist

**Date:** 2026-05-04  
**Status:** Approved

## Problem

MetaMCP's aggregating proxy (`/metamcp` public endpoints) creates downstream MCP client connections using only database-stored headers. Headers sent by incoming clients — such as OpenWebUI user/session identity headers — are silently dropped and never forwarded to downstream MCP servers.

## Goal

Allow each endpoint to declare an allowlist of header names. When a client connects, headers matching the allowlist are captured at session open and forwarded to all downstream HTTP-based MCP servers in the namespace for the lifetime of that session.

## Decisions

- **Scope:** Per-endpoint allowlist (`endpointsTable.forwarded_headers`)
- **Transports covered:** Both SSE and StreamableHTTP on public `/metamcp` endpoints
- **Collision rule:** DB-stored headers win; forwarded request headers are merged first, then DB headers overwrite on conflict
- **STDIO:** Not affected (no HTTP transport; headers are not forwarded)
- **Idle pool:** Sessions with non-empty forwarded headers bypass the idle client pool and always create fresh downstream connections

## Architecture

### Data Flow

```
Client request (e.g. x-user-id: alice)
  → GET /metamcp/:name/sse  (or POST /mcp)
  → lookupEndpoint middleware → endpoint.forwarded_headers = ['x-user-id']
  → filter req.headers by allowlist → { 'x-user-id': 'alice' }
  → store in sessionHeadersStore[sessionId]
  → metaMcpServerPool.getServer(sessionId, namespaceUuid, forwardedHeaders)
  → createServer(namespaceUuid, sessionId, includeInactive, forwardedHeaders)
  → mcpServerPool.getSession(sessionId, serverUuid, params, nsUuid, forwardedHeaders)
  → connectMetaMcpClient(params, onCrash, forwardedHeaders)
  → SSE/StreamableHTTP transport: headers = { ...forwardedHeaders, ...dbHeaders, authToken }
```

## Components Changed

### 1. Database Schema — `apps/backend/src/db/schema.ts`

Add to `endpointsTable`:
```ts
forwarded_headers: text("forwarded_headers")
  .array()
  .notNull()
  .default(sql`'{}'::text[]`),
```

Run `pnpm db:generate:dev` and `pnpm db:migrate:dev` after.

### 2. Session Headers Store — `apps/backend/src/lib/metamcp/session-headers-store.ts` (new file)

Simple in-memory Map keyed by `sessionId`:
```ts
export const sessionHeadersStore = {
  set(sessionId: string, headers: Record<string, string>): void
  get(sessionId: string): Record<string, string> | undefined
  delete(sessionId: string): void
}
```

Populated at session open; deleted at session cleanup.

### 3. Route Handlers

**`apps/backend/src/routers/public-metamcp/sse.ts`**  
**`apps/backend/src/routers/public-metamcp/streamable-http.ts`**

At session establishment (after `sessionId` is known):
1. Read `authReq.endpoint.forwarded_headers` (string[])
2. Filter `req.headers` to only those keys (case-insensitive)
3. Call `sessionHeadersStore.set(sessionId, filteredHeaders)`
4. Pass `filteredHeaders` to `metaMcpServerPool.getServer()`
5. On session close: `sessionHeadersStore.delete(sessionId)`

Also update CORS `allowedHeaders` on the public-metamcp router to pass through any headers in the allowlist (or loosen to allow all headers since downstream filtering is already enforced).

### 4. `MetaMcpServerPool` — `apps/backend/src/lib/metamcp/metamcp-server-pool.ts`

`getServer()` and `createNewServer()` gain optional `forwardedHeaders?: Record<string, string>` parameter, passed through to `createServer()`.

Idle servers (created without a real session) are not affected — they continue to be created without forwarded headers and are used only for sessions with an empty allowlist.

### 5. `createServer()` — `apps/backend/src/lib/metamcp/metamcp-proxy.ts`

Signature: `createServer(namespaceUuid, sessionId, includeInactiveServers, forwardedHeaders?)`

Store `forwardedHeaders` in the handler context (`MetaMCPHandlerContext`). Pass it to every `mcpServerPool.getSession()` call inside the `ListTools`, `CallTool`, `ListResources`, `ReadResource`, `ListPrompts`, and `GetPrompt` handlers.

### 6. `McpServerPool.getSession()` — `apps/backend/src/lib/metamcp/mcp-server-pool.ts`

Signature: `getSession(sessionId, serverUuid, params, namespaceUuid?, forwardedHeaders?)`

Logic change:
```
if forwardedHeaders is non-empty AND params.type is SSE or STREAMABLE_HTTP:
  skip idle client pool
  create fresh connection via createNewConnection(params, namespaceUuid, forwardedHeaders)
else:
  existing behavior (use idle pool)
```

`createNewConnection()` gains `forwardedHeaders?` and passes it to `connectMetaMcpClient()`.

### 7. `connectMetaMcpClient()` / `createMetaMcpClient()` — `apps/backend/src/lib/metamcp/client.ts`

Both functions gain `forwardedHeaders?: Record<string, string>`.

Header merge order (lowest → highest priority):
1. `forwardedHeaders` (incoming request, lowest priority)
2. `serverParams.headers` (DB config)
3. Auth token (`Authorization: Bearer ...`) — always applied last, DB wins

```ts
const headers: Record<string, string> = {
  ...forwardedHeaders,
  ...(serverParams.headers || {}),
};
const authToken = serverParams.oauth_tokens?.access_token || serverParams.bearerToken;
if (authToken) {
  headers["Authorization"] = `Bearer ${authToken}`;
}
```

### 8. Zod Types — `packages/zod-types`

Add `forwarded_headers: z.array(z.string()).default([])` to the endpoint schema used in tRPC mutations for create/update endpoint.

### 9. tRPC Router — `packages/trpc` / `apps/backend`

Update endpoint create and update procedures to accept and persist `forwarded_headers`.

### 10. Frontend — Endpoint Edit Form

Add a `forwarded_headers` input to the endpoint create/edit form in `apps/frontend`. A comma-separated text input (or tag-style chip input) where the admin enters header names, e.g. `x-user-id, x-session-token`. Values are trimmed and lowercased before saving.

## Error Handling

- If `forwarded_headers` is empty or null, behavior is identical to today — no change.
- If a forwarded header is not present in the incoming request, it is simply absent from the downstream headers (no error).
- Bypassing the idle pool for sessions with forwarded headers means slightly higher connection setup latency for those sessions. This is acceptable for user-identity use cases.

## Testing

- Unit test: header filtering logic (allowlist intersection, case-insensitivity)
- Unit test: merge order (forwarded < db < auth token)
- Integration test: end-to-end with a mock downstream MCP server that reflects received headers
- Existing tests must continue to pass (sessions with empty `forwarded_headers` unchanged)

## Migration

```bash
pnpm db:generate:dev   # generates migration SQL for forwarded_headers column
pnpm db:migrate:dev    # applies migration
```

No data migration needed — `DEFAULT '{}'` backfills existing rows.
