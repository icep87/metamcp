# Graph Report - metamcp  (2026-06-04)

## Corpus Check
- 221 files · ~352,127 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1054 nodes · 1316 edges · 63 communities detected
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 292 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 155|Community 155]]
- [[_COMMUNITY_Community 156|Community 156]]
- [[_COMMUNITY_Community 157|Community 157]]
- [[_COMMUNITY_Community 158|Community 158]]
- [[_COMMUNITY_Community 159|Community 159]]
- [[_COMMUNITY_Community 160|Community 160]]
- [[_COMMUNITY_Community 161|Community 161]]
- [[_COMMUNITY_Community 162|Community 162]]
- [[_COMMUNITY_Community 163|Community 163]]
- [[_COMMUNITY_Community 164|Community 164]]
- [[_COMMUNITY_Community 165|Community 165]]
- [[_COMMUNITY_Community 166|Community 166]]
- [[_COMMUNITY_Community 167|Community 167]]
- [[_COMMUNITY_Community 168|Community 168]]
- [[_COMMUNITY_Community 169|Community 169]]
- [[_COMMUNITY_Community 170|Community 170]]
- [[_COMMUNITY_Community 171|Community 171]]
- [[_COMMUNITY_Community 172|Community 172]]
- [[_COMMUNITY_Community 173|Community 173]]
- [[_COMMUNITY_Community 174|Community 174]]
- [[_COMMUNITY_Community 175|Community 175]]
- [[_COMMUNITY_Community 176|Community 176]]
- [[_COMMUNITY_Community 177|Community 177]]
- [[_COMMUNITY_Community 178|Community 178]]
- [[_COMMUNITY_Community 179|Community 179]]
- [[_COMMUNITY_Community 180|Community 180]]

## God Nodes (most connected - your core abstractions)
1. `t()` - 41 edges
2. `McpServerPool` - 33 edges
3. `MetaMcpServerPool` - 24 edges
4. `SessionLifetimeManagerImpl` - 14 edges
5. `EndpointsRepository` - 14 edges
6. `Namespace` - 14 edges
7. `DbOAuthClientProvider` - 13 edges
8. `McpServersRepository` - 13 edges
9. `Endpoint` - 13 edges
10. `getServerSpecificKey()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Namespace` --conceptually_related_to--> `MetaMCP Architecture Diagram (SVG/Excalidraw)`  [INFERRED]
  docs/cn/concepts/namespaces.mdx → metamcp.svg
- `MCP Server` --conceptually_related_to--> `MetaMCP Architecture Diagram (SVG/Excalidraw)`  [INFERRED]
  docs/cn/concepts/mcp-servers.mdx → metamcp.svg
- `handleToggleAutoRefresh()` --calls--> `t()`  [INFERRED]
  /Users/plp1lud/Documents/GitHub/metamcp/apps/frontend/app/[locale]/(sidebar)/live-logs/page.tsx → apps/frontend/components/edit-endpoint.tsx
- `handleServerStatusChange()` --calls--> `t()`  [INFERRED]
  /Users/plp1lud/Documents/GitHub/metamcp/apps/frontend/app/[locale]/(sidebar)/namespaces/[uuid]/page.tsx → apps/frontend/components/edit-endpoint.tsx
- `getMenuItems()` --calls--> `t()`  [INFERRED]
  /Users/plp1lud/Documents/GitHub/metamcp/apps/frontend/app/[locale]/(sidebar)/layout.tsx → apps/frontend/components/edit-endpoint.tsx

## Hyperedges (group relationships)
- **MetaMCP Core Concepts** — readme_mcp_server_config, readme_namespace, readme_endpoint, readme_middleware, readme_inspector, readme_tool_overrides [EXTRACTED 1.00]
- **MetaMCP Authentication System** — readme_authentication, readme_api_key_auth, readme_oidc, readme_better_auth, readme_oauth, readme_registration_controls [EXTRACTED 0.95]
- **MetaMCP Transport Options** — readme_sse_transport, readme_streamable_http, readme_openapi_endpoint [EXTRACTED 1.00]
- **MetaMCP Tech Stack** — readme_nextjs_frontend, readme_expressjs_backend, readme_better_auth, readme_turborepo, readme_docker_compose [EXTRACTED 0.95]
- **MetaMCP Core Concepts** — concept_metamcp, concept_namespace, concept_endpoint, concept_mcp_server, concept_middleware, concept_inspector, concept_api_key [EXTRACTED 1.00]
- **Supported Transport Options** — concept_transport_sse, concept_transport_streamable_http, concept_transport_stdio, concept_transport_openapi [EXTRACTED 1.00]
- **Built-in Middleware Options** — concept_filter_inactive_tools, concept_request_logging_middleware, concept_rate_limiting_middleware, concept_input_validation_middleware, concept_response_caching_middleware [EXTRACTED 1.00]
- **Supported MCP Client Integrations** — concept_claude_desktop, concept_cursor_ide, concept_open_webui, concept_mcp_proxy_tool, concept_mcp_remote_tool [EXTRACTED 1.00]
- **Authentication Mechanisms** — concept_api_key, concept_oauth, concept_oidc, concept_better_auth [EXTRACTED 1.00]
- **Production Deployment Infrastructure** — concept_docker_compose, concept_nginx, concept_lets_encrypt [EXTRACTED 1.00]
- **MetaMCP Core Concepts** — concept_mcp_server, concept_namespace, concept_endpoint, concept_middleware [EXTRACTED 1.00]
- **Middleware Pipeline Components** — concept_filter_inactive_tools, concept_request_logging, concept_rate_limiting, concept_input_validation, concept_response_caching [EXTRACTED 1.00]
- **MCP Server Transport Types** — concept_stdio_server, concept_sse_server, concept_streamable_http_server [EXTRACTED 1.00]
- **Upstream OAuth Delegation Components** — concept_oauth_metadata_mirror, concept_dynamic_client_registration_proxy, concept_upstream_delegate_middleware, concept_upstream_token_store, concept_upstream_401_propagation, concept_per_endpoint_wellknown [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.03
Nodes (48): handleClose(), handleEditEndpoint(), t(), handleClose(), handleEditServer(), handleClose(), handleEditNamespace(), copyFullApiUrl() (+40 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (83): API Key Authentication, auth_mode Endpoint Config Field, Better Auth (auth library), Bulk Import/Export of MCP Servers, Claude Desktop Integration, Cursor IDE Integration, Docker Compose Deployment, Dynamic Client Registration Proxy (+75 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (21): authenticateApiKey(), checkApiKeyAccess(), checkOAuthAccess(), extractAuthToken(), getBaseUrl(), sendApiKeyRequiredResponse(), sendOAuthChallengeResponse(), validateOAuthToken() (+13 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (8): cleanupSession(), MetaMcpServerPool, OAuthRepository, cleanupSession(), cleanupSession(), executeToolWithMiddleware(), clearOverrideCache(), ToolsRepository

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (22): connectMetaMcpClient(), createMetaMcpClient(), sleep(), transformDockerUrl(), getMcpServers(), lookupEndpoint(), handleDatabaseError(), McpServersRepository (+14 more)

### Community 5 - "Community 5"
Cohesion: 0.06
Nodes (5): shutdown(), start(), McpServerPool, PgNotify, ToolDiscoveryService

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (39): Development Environment Setup, MetaMCP Contributing Guide, OIDC Provider Setup (Contributing), Architecture Overview (CN Docs), Quickstart Guide (CN Docs), Idle Session Invalidation Flow, McpServerPool, MetaMcpServerPool (+31 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (24): bootstrapApiKeys(), bootstrapEndpoints(), bootstrapNamespaces(), bootstrapUsers(), ensureUser(), generateApiKey(), getConfigValue(), getOwnerEmail() (+16 more)

### Community 8 - "Community 8"
Cohesion: 0.09
Nodes (15): clearFilterCache(), createFilterCallToolMiddleware(), createFilterListToolsMiddleware(), getToolStatus(), isToolAllowed(), ToolStatusCache, compose(), createMiddlewareEnabledHandlers() (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.13
Nodes (6): getServerSpecificKey(), createAuthProvider(), DbOAuthClientProvider, DebugDbOAuthClientProvider, handleCallback(), useConnection()

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (11): createApiKeysRouter(), createConfigRouter(), createEndpointsRouter(), createFrontendRouter(), Input(), createLogsRouter(), createMcpServersRouter(), createNamespacesRouter() (+3 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (9): rateLimiter(), rateLimitMiddleware(), slidingWindowRateLimiter(), tokenBucketRateLimiter(), RateLimitError, RateLimiting, SlidingWindowRateLimiter, SlidingWindowRateLimiting (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (8): formatDate(), getConnectionStatusInfo(), handleConnectionRefresh(), handleConnectionToggle(), handleEditSuccess(), handleServerStatusChange(), toLocaleDateString(), formatDate()

### Community 13 - "Community 13"
Cohesion: 0.12
Nodes (6): getBaseUrl(), hashClientSecret(), rateLimitAuth(), RateLimiter, rateLimitToken(), verifyClientSecret()

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (3): ProcessManagedStdioTransport, deserializeMessage(), ReadBuffer

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (1): EndpointsRepository

### Community 16 - "Community 16"
Cohesion: 0.15
Nodes (4): MetaMcpLogStore, handleClearLogs(), handleRefresh(), handleToggleAutoRefresh()

### Community 17 - "Community 17"
Cohesion: 0.17
Nodes (1): NamespacesRepository

### Community 18 - "Community 18"
Cohesion: 0.26
Nodes (6): cancelEditingOverrides(), formatAnnotations(), handleOverridesUpdate(), handleStatusToggle(), saveOverrides(), t()

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (1): ApiKeysRepository

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (2): SidebarMenuButton(), useSidebar()

### Community 22 - "Community 22"
Cohesion: 0.36
Nodes (2): hashTools(), ToolsSyncCache

### Community 24 - "Community 24"
Cohesion: 0.29
Nodes (3): getLocalizedPath(), getPathnameWithoutLocale(), getMenuItems()

### Community 29 - "Community 29"
Cohesion: 0.33
Nodes (1): Logger

### Community 30 - "Community 30"
Cohesion: 0.29
Nodes (1): NamespacesSerializer

### Community 31 - "Community 31"
Cohesion: 0.29
Nodes (7): Drizzle ORM / DB Schema, Internationalization (i18n), OpenID Connect (OIDC) SSO, shadcn/ui Components, tRPC API Layer, EN Contributing Guide, EN Internationalization Guide

### Community 33 - "Community 33"
Cohesion: 0.53
Nodes (4): FormControl(), FormDescription(), FormMessage(), useFormField()

### Community 34 - "Community 34"
Cohesion: 0.33
Nodes (3): LanguageSwitcher(), useLocale(), useTranslations()

### Community 35 - "Community 35"
Cohesion: 0.33
Nodes (1): EndpointsSerializer

### Community 38 - "Community 38"
Cohesion: 0.4
Nodes (1): FakeTransport

### Community 39 - "Community 39"
Cohesion: 0.6
Nodes (3): isExpectedTransportDisconnectError(), onClientError(), onServerError()

### Community 40 - "Community 40"
Cohesion: 0.4
Nodes (1): ApiKeysSerializer

### Community 41 - "Community 41"
Cohesion: 0.7
Nodes (5): MetaMCP Architecture Diagram, MCP Client, Proxy/Aggregation Layer, MetaMCP Server, Upstream MCP Servers

### Community 45 - "Community 45"
Cohesion: 0.5
Nodes (1): McpServersSerializer

### Community 46 - "Community 46"
Cohesion: 0.5
Nodes (1): ToolsSerializer

### Community 51 - "Community 51"
Cohesion: 0.67
Nodes (1): OAuthSessionsSerializer

### Community 80 - "Community 80"
Cohesion: 1.0
Nodes (2): Mintlify docs.json Settings, Mintlify Global Settings

### Community 155 - "Community 155"
Cohesion: 1.0
Nodes (1): Docker Compose Deployment

### Community 156 - "Community 156"
Cohesion: 1.0
Nodes (1): Recent Updates - Maintenance Note

### Community 157 - "Community 157"
Cohesion: 1.0
Nodes (1): CN Middleware Concept (Active Dev)

### Community 158 - "Community 158"
Cohesion: 1.0
Nodes (1): EN Integration Troubleshooting (Future)

### Community 159 - "Community 159"
Cohesion: 1.0
Nodes (1): ESLint Config Package

### Community 160 - "Community 160"
Cohesion: 1.0
Nodes (1): MetaMCP UI Screenshot

### Community 161 - "Community 161"
Cohesion: 1.0
Nodes (1): MetaMCP Favicon

### Community 162 - "Community 162"
Cohesion: 1.0
Nodes (1): MetaMCP Screenshot (docs)

### Community 163 - "Community 163"
Cohesion: 1.0
Nodes (1): MetaMCP Hero Image (Light)

### Community 164 - "Community 164"
Cohesion: 1.0
Nodes (1): Checks Passed Screenshot

### Community 165 - "Community 165"
Cohesion: 1.0
Nodes (1): MetaMCP Hero Image (Dark)

### Community 166 - "Community 166"
Cohesion: 1.0
Nodes (1): Open WebUI Integration Screenshot 4

### Community 167 - "Community 167"
Cohesion: 1.0
Nodes (1): Open WebUI Integration Screenshot 5

### Community 168 - "Community 168"
Cohesion: 1.0
Nodes (1): Open WebUI Integration Screenshot 6

### Community 169 - "Community 169"
Cohesion: 1.0
Nodes (1): Open WebUI Integration Screenshot 2

### Community 170 - "Community 170"
Cohesion: 1.0
Nodes (1): Open WebUI Integration Screenshot 3

### Community 171 - "Community 171"
Cohesion: 1.0
Nodes (1): Open WebUI Integration Screenshot 1

### Community 172 - "Community 172"
Cohesion: 1.0
Nodes (1): MetaMCP Logo (Dark Theme)

### Community 173 - "Community 173"
Cohesion: 1.0
Nodes (1): MetaMCP Logo (Light Theme)

### Community 174 - "Community 174"
Cohesion: 1.0
Nodes (1): Turborepo Logo (Dark Theme)

### Community 175 - "Community 175"
Cohesion: 1.0
Nodes (1): File Text Icon

### Community 176 - "Community 176"
Cohesion: 1.0
Nodes (1): Vercel Logo (Triangle Icon)

### Community 177 - "Community 177"
Cohesion: 1.0
Nodes (1): Next.js Logo

### Community 178 - "Community 178"
Cohesion: 1.0
Nodes (1): Turborepo Logo (Light Theme)

### Community 179 - "Community 179"
Cohesion: 1.0
Nodes (1): Globe Icon

### Community 180 - "Community 180"
Cohesion: 1.0
Nodes (1): Browser Window Icon

## Knowledge Gaps
- **78 isolated node(s):** `MetaMCP Inspector`, `Tool Overrides & Annotations`, `MCP Rate Limiting`, `Registration Controls`, `Docker Compose Deployment` (+73 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 15`** (15 nodes): `endpoints.repo.ts`, `EndpointsRepository`, `.create()`, `.deleteByUuid()`, `.findAll()`, `.findAllAccessibleToUser()`, `.findAllAccessibleToUserWithNamespaces()`, `.findAllWithNamespaces()`, `.findByName()`, `.findByNameAndUserId()`, `.findByUserId()`, `.findByUuid()`, `.findByUuidWithNamespace()`, `.findPublicEndpoints()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (13 nodes): `namespaces.repo.ts`, `NamespacesRepository`, `.create()`, `.deleteByUuid()`, `.findAll()`, `.findAllAccessibleToUser()`, `.findByNameAndUserId()`, `.findByUserId()`, `.findByUuid()`, `.findByUuidWithServers()`, `.findPublicNamespaces()`, `.findToolsByNamespaceUuid()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 19`** (12 nodes): `ApiKeysRepository`, `.create()`, `.findAccessibleToUser()`, `.findAll()`, `.findByUserId()`, `.findByUuid()`, `.findByUuidWithAccess()`, `.findPublicApiKeys()`, `.generateApiKey()`, `.update()`, `.validateApiKey()`, `api-keys.repo.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (10 nodes): `sidebar.tsx`, `cn()`, `handleKeyDown()`, `SidebarFooter()`, `SidebarHeader()`, `SidebarMenu()`, `SidebarMenuButton()`, `SidebarMenuItem()`, `SidebarSeparator()`, `useSidebar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (9 nodes): `tools-sync-cache.ts`, `hashTools()`, `ToolsSyncCache`, `.clear()`, `.getStats()`, `.hasChanged()`, `.hashTools()`, `.shouldSync()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (7 nodes): `logger.ts`, `getValidLogLevel()`, `Logger`, `.close()`, `.constructor()`, `.customLog()`, `.formatDate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (7 nodes): `namespaces.serializer.ts`, `NamespacesSerializer`, `.serializeNamespace()`, `.serializeNamespaceList()`, `.serializeNamespaceTool()`, `.serializeNamespaceTools()`, `.serializeNamespaceWithServers()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (6 nodes): `endpoints.serializer.ts`, `EndpointsSerializer`, `.serializeEndpoint()`, `.serializeEndpointList()`, `.serializeEndpointWithNamespace()`, `.serializeEndpointWithNamespaceList()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (5 nodes): `mcp-proxy.test.ts`, `FakeTransport`, `.close()`, `.send()`, `.start()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (5 nodes): `ApiKeysSerializer`, `.serializeApiKey()`, `.serializeApiKeyList()`, `.serializeCreateApiKeyResponse()`, `api-keys.serializer.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (4 nodes): `mcp-servers.serializer.ts`, `McpServersSerializer`, `.serializeMcpServer()`, `.serializeMcpServerList()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (4 nodes): `tools.serializer.ts`, `ToolsSerializer`, `.serializeTool()`, `.serializeToolList()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (3 nodes): `oauth-sessions.serializer.ts`, `OAuthSessionsSerializer`, `.serializeOAuthSession()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 80`** (2 nodes): `Mintlify docs.json Settings`, `Mintlify Global Settings`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 155`** (1 nodes): `Docker Compose Deployment`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 156`** (1 nodes): `Recent Updates - Maintenance Note`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 157`** (1 nodes): `CN Middleware Concept (Active Dev)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 158`** (1 nodes): `EN Integration Troubleshooting (Future)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 159`** (1 nodes): `ESLint Config Package`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 160`** (1 nodes): `MetaMCP UI Screenshot`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 161`** (1 nodes): `MetaMCP Favicon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 162`** (1 nodes): `MetaMCP Screenshot (docs)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 163`** (1 nodes): `MetaMCP Hero Image (Light)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 164`** (1 nodes): `Checks Passed Screenshot`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 165`** (1 nodes): `MetaMCP Hero Image (Dark)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 166`** (1 nodes): `Open WebUI Integration Screenshot 4`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 167`** (1 nodes): `Open WebUI Integration Screenshot 5`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 168`** (1 nodes): `Open WebUI Integration Screenshot 6`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 169`** (1 nodes): `Open WebUI Integration Screenshot 2`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 170`** (1 nodes): `Open WebUI Integration Screenshot 3`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 171`** (1 nodes): `Open WebUI Integration Screenshot 1`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 172`** (1 nodes): `MetaMCP Logo (Dark Theme)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 173`** (1 nodes): `MetaMCP Logo (Light Theme)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 174`** (1 nodes): `Turborepo Logo (Dark Theme)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 175`** (1 nodes): `File Text Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 176`** (1 nodes): `Vercel Logo (Triangle Icon)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 177`** (1 nodes): `Next.js Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 178`** (1 nodes): `Turborepo Logo (Light Theme)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 179`** (1 nodes): `Globe Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 180`** (1 nodes): `Browser Window Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `Community 0` to `Community 24`, `Community 16`, `Community 12`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `unsubscribeFromResource()` connect `Community 0` to `Community 3`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `MetaMcpServerPool` connect `Community 3` to `Community 4`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Are the 39 inferred relationships involving `t()` (e.g. with `getMenuItems()` and `handleSignupToggle()`) actually correct?**
  _`t()` has 39 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MetaMCP Inspector`, `Tool Overrides & Annotations`, `MCP Rate Limiting` to the rest of the system?**
  _78 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._