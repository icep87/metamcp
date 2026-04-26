# Graph Report - .  (2026-04-26)

## Corpus Check
- Large corpus: 293 files · ~352,618 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 1043 nodes · 1304 edges · 59 communities detected
- Extraction: 78% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 288 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Frontend Pages & UI|Frontend Pages & UI]]
- [[_COMMUNITY_Documentation & Concepts|Documentation & Concepts]]
- [[_COMMUNITY_MetaMCP Proxy & Middleware|MetaMCP Proxy & Middleware]]
- [[_COMMUNITY_Backend Core & Tool Discovery|Backend Core & Tool Discovery]]
- [[_COMMUNITY_Database Repositories|Database Repositories]]
- [[_COMMUNITY_Auth & Bootstrap Services|Auth & Bootstrap Services]]
- [[_COMMUNITY_Contributing & Architecture Docs|Contributing & Architecture Docs]]
- [[_COMMUNITY_MCP Client & Session Management|MCP Client & Session Management]]
- [[_COMMUNITY_Auth Middleware & API Keys|Auth Middleware & API Keys]]
- [[_COMMUNITY_Frontend OAuth & Constants|Frontend OAuth & Constants]]
- [[_COMMUNITY_MetaMCP Server Pool|MetaMCP Server Pool]]
- [[_COMMUNITY_tRPC Routers|tRPC Routers]]
- [[_COMMUNITY_Rate Limiting|Rate Limiting]]
- [[_COMMUNITY_Namespace & Server UI Pages|Namespace & Server UI Pages]]
- [[_COMMUNITY_OAuth Token Utilities|OAuth Token Utilities]]
- [[_COMMUNITY_STDIO Transport Process|STDIO Transport Process]]
- [[_COMMUNITY_Live Logs & Log Store|Live Logs & Log Store]]
- [[_COMMUNITY_Namespaces Repository|Namespaces Repository]]
- [[_COMMUNITY_Tool Overrides Table|Tool Overrides Table]]
- [[_COMMUNITY_Sidebar Navigation|Sidebar Navigation]]
- [[_COMMUNITY_i18n & Layout|i18n & Layout]]
- [[_COMMUNITY_Logger|Logger]]
- [[_COMMUNITY_Namespace Serializers|Namespace Serializers]]
- [[_COMMUNITY_Dev Stack Concepts|Dev Stack Concepts]]
- [[_COMMUNITY_Module Group 30|Module Group 30]]
- [[_COMMUNITY_Module Group 32|Module Group 32]]
- [[_COMMUNITY_Module Group 33|Module Group 33]]
- [[_COMMUNITY_Module Group 36|Module Group 36]]
- [[_COMMUNITY_Module Group 37|Module Group 37]]
- [[_COMMUNITY_Module Group 42|Module Group 42]]
- [[_COMMUNITY_Module Group 43|Module Group 43]]
- [[_COMMUNITY_Module Group 48|Module Group 48]]
- [[_COMMUNITY_Module Group 77|Module Group 77]]
- [[_COMMUNITY_Module Group 148|Module Group 148]]
- [[_COMMUNITY_Module Group 149|Module Group 149]]
- [[_COMMUNITY_Module Group 150|Module Group 150]]
- [[_COMMUNITY_Module Group 151|Module Group 151]]
- [[_COMMUNITY_Module Group 152|Module Group 152]]
- [[_COMMUNITY_Module Group 153|Module Group 153]]
- [[_COMMUNITY_Module Group 154|Module Group 154]]
- [[_COMMUNITY_Module Group 155|Module Group 155]]
- [[_COMMUNITY_Module Group 156|Module Group 156]]
- [[_COMMUNITY_Module Group 157|Module Group 157]]
- [[_COMMUNITY_Module Group 158|Module Group 158]]
- [[_COMMUNITY_Module Group 159|Module Group 159]]
- [[_COMMUNITY_Module Group 160|Module Group 160]]
- [[_COMMUNITY_Module Group 161|Module Group 161]]
- [[_COMMUNITY_Module Group 162|Module Group 162]]
- [[_COMMUNITY_Module Group 163|Module Group 163]]
- [[_COMMUNITY_Module Group 164|Module Group 164]]
- [[_COMMUNITY_Module Group 165|Module Group 165]]
- [[_COMMUNITY_Module Group 166|Module Group 166]]
- [[_COMMUNITY_Module Group 167|Module Group 167]]
- [[_COMMUNITY_Module Group 168|Module Group 168]]
- [[_COMMUNITY_Module Group 169|Module Group 169]]
- [[_COMMUNITY_Module Group 170|Module Group 170]]
- [[_COMMUNITY_Module Group 171|Module Group 171]]
- [[_COMMUNITY_Module Group 172|Module Group 172]]
- [[_COMMUNITY_Module Group 173|Module Group 173]]

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
- `MetaMCP Architecture Diagram (SVG/Excalidraw)` --conceptually_related_to--> `Namespace`  [INFERRED]
  metamcp.svg → docs/cn/concepts/namespaces.mdx
- `MetaMCP Architecture Diagram (SVG/Excalidraw)` --conceptually_related_to--> `MCP Server`  [INFERRED]
  metamcp.svg → docs/cn/concepts/mcp-servers.mdx
- `MetaMCP OAuth Flow` --conceptually_related_to--> `Authentication System`  [INFERRED]
  README-oauth.md → README.md
- `Architecture Overview (CN Docs)` --semantically_similar_to--> `MetaMCP Architecture`  [EXTRACTED] [semantically similar]
  docs/cn/development/architecture.mdx → README.md
- `handleToggleAutoRefresh()` --calls--> `t()`  [INFERRED]
  /Users/plp1lud/Documents/GitHub/metamcp/apps/frontend/app/[locale]/(sidebar)/live-logs/page.tsx → /Users/plp1lud/Documents/GitHub/metamcp/apps/frontend/components/edit-endpoint.tsx

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

### Community 0 - "Frontend Pages & UI"
Cohesion: 0.03
Nodes (48): handleClose(), handleEditEndpoint(), t(), handleClose(), handleEditServer(), handleClose(), handleEditNamespace(), copyFullApiUrl() (+40 more)

### Community 1 - "Documentation & Concepts"
Cohesion: 0.04
Nodes (83): API Key Authentication, auth_mode Endpoint Config Field, Better Auth (auth library), Bulk Import/Export of MCP Servers, Claude Desktop Integration, Cursor IDE Integration, Docker Compose Deployment, Dynamic Client Registration Proxy (+75 more)

### Community 2 - "MetaMCP Proxy & Middleware"
Cohesion: 0.04
Nodes (23): DownstreamNotificationManager, clearFilterCache(), createFilterCallToolMiddleware(), createFilterListToolsMiddleware(), getToolStatus(), isToolAllowed(), ToolStatusCache, compose() (+15 more)

### Community 3 - "Backend Core & Tool Discovery"
Cohesion: 0.04
Nodes (10): shutdown(), start(), McpServerPool, PgNotify, cleanupSession(), cleanupSession(), ToolDiscoveryService, clearOverrideCache() (+2 more)

### Community 4 - "Database Repositories"
Cohesion: 0.05
Nodes (5): EndpointsRepository, cleanupSession(), OAuthRepository, ServerErrorTracker, ToolsRepository

### Community 5 - "Auth & Bootstrap Services"
Cohesion: 0.07
Nodes (29): betterAuthMcpMiddleware(), bootstrapApiKeys(), bootstrapEndpoints(), bootstrapNamespaces(), bootstrapUsers(), ensureUser(), generateApiKey(), getConfigValue() (+21 more)

### Community 6 - "Contributing & Architecture Docs"
Cohesion: 0.06
Nodes (39): Development Environment Setup, MetaMCP Contributing Guide, OIDC Provider Setup (Contributing), Architecture Overview (CN Docs), Quickstart Guide (CN Docs), Idle Session Invalidation Flow, McpServerPool, MetaMcpServerPool (+31 more)

### Community 7 - "MCP Client & Session Management"
Cohesion: 0.09
Nodes (19): connectMetaMcpClient(), createMetaMcpClient(), sleep(), transformDockerUrl(), getMcpServers(), OAuthSessionsRepository, checkServerErrorStatus(), cleanupSession() (+11 more)

### Community 8 - "Auth Middleware & API Keys"
Cohesion: 0.11
Nodes (11): authenticateApiKey(), checkApiKeyAccess(), checkOAuthAccess(), extractAuthToken(), getBaseUrl(), sendApiKeyRequiredResponse(), sendOAuthChallengeResponse(), validateOAuthToken() (+3 more)

### Community 9 - "Frontend OAuth & Constants"
Cohesion: 0.13
Nodes (6): getServerSpecificKey(), createAuthProvider(), DbOAuthClientProvider, DebugDbOAuthClientProvider, handleCallback(), useConnection()

### Community 10 - "MetaMCP Server Pool"
Cohesion: 0.13
Nodes (2): MetaMcpServerPool, executeToolWithMiddleware()

### Community 11 - "tRPC Routers"
Cohesion: 0.12
Nodes (11): createApiKeysRouter(), createConfigRouter(), createEndpointsRouter(), createFrontendRouter(), Input(), createLogsRouter(), createMcpServersRouter(), createNamespacesRouter() (+3 more)

### Community 12 - "Rate Limiting"
Cohesion: 0.13
Nodes (9): rateLimiter(), rateLimitMiddleware(), slidingWindowRateLimiter(), tokenBucketRateLimiter(), RateLimitError, RateLimiting, SlidingWindowRateLimiter, SlidingWindowRateLimiting (+1 more)

### Community 13 - "Namespace & Server UI Pages"
Cohesion: 0.11
Nodes (8): formatDate(), getConnectionStatusInfo(), handleConnectionRefresh(), handleConnectionToggle(), handleEditSuccess(), handleServerStatusChange(), toLocaleDateString(), formatDate()

### Community 14 - "OAuth Token Utilities"
Cohesion: 0.12
Nodes (6): getBaseUrl(), hashClientSecret(), rateLimitAuth(), RateLimiter, rateLimitToken(), verifyClientSecret()

### Community 15 - "STDIO Transport Process"
Cohesion: 0.12
Nodes (3): ProcessManagedStdioTransport, deserializeMessage(), ReadBuffer

### Community 16 - "Live Logs & Log Store"
Cohesion: 0.15
Nodes (4): MetaMcpLogStore, handleClearLogs(), handleRefresh(), handleToggleAutoRefresh()

### Community 17 - "Namespaces Repository"
Cohesion: 0.17
Nodes (1): NamespacesRepository

### Community 18 - "Tool Overrides Table"
Cohesion: 0.26
Nodes (6): cancelEditingOverrides(), formatAnnotations(), handleOverridesUpdate(), handleStatusToggle(), saveOverrides(), t()

### Community 20 - "Sidebar Navigation"
Cohesion: 0.22
Nodes (2): SidebarMenuButton(), useSidebar()

### Community 22 - "i18n & Layout"
Cohesion: 0.29
Nodes (3): getLocalizedPath(), getPathnameWithoutLocale(), getMenuItems()

### Community 27 - "Logger"
Cohesion: 0.33
Nodes (1): Logger

### Community 28 - "Namespace Serializers"
Cohesion: 0.29
Nodes (1): NamespacesSerializer

### Community 29 - "Dev Stack Concepts"
Cohesion: 0.29
Nodes (7): Drizzle ORM / DB Schema, Internationalization (i18n), OpenID Connect (OIDC) SSO, shadcn/ui Components, tRPC API Layer, EN Contributing Guide, EN Internationalization Guide

### Community 30 - "Module Group 30"
Cohesion: 0.33
Nodes (3): LanguageSwitcher(), useLocale(), useTranslations()

### Community 32 - "Module Group 32"
Cohesion: 0.53
Nodes (4): FormControl(), FormDescription(), FormMessage(), useFormField()

### Community 33 - "Module Group 33"
Cohesion: 0.33
Nodes (1): EndpointsSerializer

### Community 36 - "Module Group 36"
Cohesion: 0.4
Nodes (1): ApiKeysSerializer

### Community 37 - "Module Group 37"
Cohesion: 0.7
Nodes (5): MetaMCP Architecture Diagram, MCP Client, Proxy/Aggregation Layer, MetaMCP Server, Upstream MCP Servers

### Community 42 - "Module Group 42"
Cohesion: 0.5
Nodes (1): McpServersSerializer

### Community 43 - "Module Group 43"
Cohesion: 0.5
Nodes (1): ToolsSerializer

### Community 48 - "Module Group 48"
Cohesion: 0.67
Nodes (1): OAuthSessionsSerializer

### Community 77 - "Module Group 77"
Cohesion: 1.0
Nodes (2): Mintlify docs.json Settings, Mintlify Global Settings

### Community 148 - "Module Group 148"
Cohesion: 1.0
Nodes (1): Docker Compose Deployment

### Community 149 - "Module Group 149"
Cohesion: 1.0
Nodes (1): Recent Updates - Maintenance Note

### Community 150 - "Module Group 150"
Cohesion: 1.0
Nodes (1): CN Middleware Concept (Active Dev)

### Community 151 - "Module Group 151"
Cohesion: 1.0
Nodes (1): EN Integration Troubleshooting (Future)

### Community 152 - "Module Group 152"
Cohesion: 1.0
Nodes (1): ESLint Config Package

### Community 153 - "Module Group 153"
Cohesion: 1.0
Nodes (1): MetaMCP UI Screenshot

### Community 154 - "Module Group 154"
Cohesion: 1.0
Nodes (1): MetaMCP Favicon

### Community 155 - "Module Group 155"
Cohesion: 1.0
Nodes (1): MetaMCP Screenshot (docs)

### Community 156 - "Module Group 156"
Cohesion: 1.0
Nodes (1): MetaMCP Hero Image (Light)

### Community 157 - "Module Group 157"
Cohesion: 1.0
Nodes (1): Checks Passed Screenshot

### Community 158 - "Module Group 158"
Cohesion: 1.0
Nodes (1): MetaMCP Hero Image (Dark)

### Community 159 - "Module Group 159"
Cohesion: 1.0
Nodes (1): Open WebUI Integration Screenshot 4

### Community 160 - "Module Group 160"
Cohesion: 1.0
Nodes (1): Open WebUI Integration Screenshot 5

### Community 161 - "Module Group 161"
Cohesion: 1.0
Nodes (1): Open WebUI Integration Screenshot 6

### Community 162 - "Module Group 162"
Cohesion: 1.0
Nodes (1): Open WebUI Integration Screenshot 2

### Community 163 - "Module Group 163"
Cohesion: 1.0
Nodes (1): Open WebUI Integration Screenshot 3

### Community 164 - "Module Group 164"
Cohesion: 1.0
Nodes (1): Open WebUI Integration Screenshot 1

### Community 165 - "Module Group 165"
Cohesion: 1.0
Nodes (1): MetaMCP Logo (Dark Theme)

### Community 166 - "Module Group 166"
Cohesion: 1.0
Nodes (1): MetaMCP Logo (Light Theme)

### Community 167 - "Module Group 167"
Cohesion: 1.0
Nodes (1): Turborepo Logo (Dark Theme)

### Community 168 - "Module Group 168"
Cohesion: 1.0
Nodes (1): File Text Icon

### Community 169 - "Module Group 169"
Cohesion: 1.0
Nodes (1): Vercel Logo (Triangle Icon)

### Community 170 - "Module Group 170"
Cohesion: 1.0
Nodes (1): Next.js Logo

### Community 171 - "Module Group 171"
Cohesion: 1.0
Nodes (1): Turborepo Logo (Light Theme)

### Community 172 - "Module Group 172"
Cohesion: 1.0
Nodes (1): Globe Icon

### Community 173 - "Module Group 173"
Cohesion: 1.0
Nodes (1): Browser Window Icon

## Knowledge Gaps
- **78 isolated node(s):** `MetaMCP Inspector`, `Tool Overrides & Annotations`, `MCP Rate Limiting`, `Registration Controls`, `Docker Compose Deployment` (+73 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `MetaMCP Server Pool`** (23 nodes): `metamcp-server-pool.ts`, `tool-execution.ts`, `MetaMcpServerPool`, `.cleanupExpiredSessions()`, `.cleanupSession()`, `.constructor()`, `.createIdleServer()`, `.createIdleServerAsync()`, `.createNewServer()`, `.ensureIdleServerForNewNamespace()`, `.getActiveSessionIds()`, `.getInstance()`, `.getMcpServerPoolStatus()`, `.getOpenApiServer()`, `.getPoolStatus()`, `.getServer()`, `.getServerInstance()`, `.getSessionAge()`, `.invalidateIdleServers()`, `.invalidateOpenApiSessions()`, `.isSessionExpired()`, `.startCleanupTimer()`, `executeToolWithMiddleware()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Namespaces Repository`** (13 nodes): `namespaces.repo.ts`, `NamespacesRepository`, `.create()`, `.deleteByUuid()`, `.findAll()`, `.findAllAccessibleToUser()`, `.findByNameAndUserId()`, `.findByUserId()`, `.findByUuid()`, `.findByUuidWithServers()`, `.findPublicNamespaces()`, `.findToolsByNamespaceUuid()`, `.update()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Sidebar Navigation`** (10 nodes): `sidebar.tsx`, `cn()`, `handleKeyDown()`, `SidebarFooter()`, `SidebarHeader()`, `SidebarMenu()`, `SidebarMenuButton()`, `SidebarMenuItem()`, `SidebarSeparator()`, `useSidebar()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Logger`** (7 nodes): `logger.ts`, `getValidLogLevel()`, `Logger`, `.close()`, `.constructor()`, `.customLog()`, `.formatDate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Namespace Serializers`** (7 nodes): `namespaces.serializer.ts`, `NamespacesSerializer`, `.serializeNamespace()`, `.serializeNamespaceList()`, `.serializeNamespaceTool()`, `.serializeNamespaceTools()`, `.serializeNamespaceWithServers()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 33`** (6 nodes): `endpoints.serializer.ts`, `EndpointsSerializer`, `.serializeEndpoint()`, `.serializeEndpointList()`, `.serializeEndpointWithNamespace()`, `.serializeEndpointWithNamespaceList()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 36`** (5 nodes): `ApiKeysSerializer`, `.serializeApiKey()`, `.serializeApiKeyList()`, `.serializeCreateApiKeyResponse()`, `api-keys.serializer.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 42`** (4 nodes): `mcp-servers.serializer.ts`, `McpServersSerializer`, `.serializeMcpServer()`, `.serializeMcpServerList()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 43`** (4 nodes): `tools.serializer.ts`, `ToolsSerializer`, `.serializeTool()`, `.serializeToolList()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 48`** (3 nodes): `oauth-sessions.serializer.ts`, `OAuthSessionsSerializer`, `.serializeOAuthSession()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 77`** (2 nodes): `Mintlify docs.json Settings`, `Mintlify Global Settings`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 148`** (1 nodes): `Docker Compose Deployment`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 149`** (1 nodes): `Recent Updates - Maintenance Note`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 150`** (1 nodes): `CN Middleware Concept (Active Dev)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 151`** (1 nodes): `EN Integration Troubleshooting (Future)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 152`** (1 nodes): `ESLint Config Package`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 153`** (1 nodes): `MetaMCP UI Screenshot`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 154`** (1 nodes): `MetaMCP Favicon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 155`** (1 nodes): `MetaMCP Screenshot (docs)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 156`** (1 nodes): `MetaMCP Hero Image (Light)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 157`** (1 nodes): `Checks Passed Screenshot`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 158`** (1 nodes): `MetaMCP Hero Image (Dark)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 159`** (1 nodes): `Open WebUI Integration Screenshot 4`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 160`** (1 nodes): `Open WebUI Integration Screenshot 5`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 161`** (1 nodes): `Open WebUI Integration Screenshot 6`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 162`** (1 nodes): `Open WebUI Integration Screenshot 2`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 163`** (1 nodes): `Open WebUI Integration Screenshot 3`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 164`** (1 nodes): `Open WebUI Integration Screenshot 1`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 165`** (1 nodes): `MetaMCP Logo (Dark Theme)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 166`** (1 nodes): `MetaMCP Logo (Light Theme)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 167`** (1 nodes): `Turborepo Logo (Dark Theme)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 168`** (1 nodes): `File Text Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 169`** (1 nodes): `Vercel Logo (Triangle Icon)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 170`** (1 nodes): `Next.js Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 171`** (1 nodes): `Turborepo Logo (Light Theme)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 172`** (1 nodes): `Globe Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Module Group 173`** (1 nodes): `Browser Window Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `t()` connect `Frontend Pages & UI` to `Live Logs & Log Store`, `Namespace & Server UI Pages`, `i18n & Layout`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `unsubscribeFromResource()` connect `Frontend Pages & UI` to `Database Repositories`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Why does `handleCallback()` connect `Frontend OAuth & Constants` to `MetaMCP Proxy & Middleware`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 39 inferred relationships involving `t()` (e.g. with `getMenuItems()` and `handleSignupToggle()`) actually correct?**
  _`t()` has 39 INFERRED edges - model-reasoned connections that need verification._
- **What connects `MetaMCP Inspector`, `Tool Overrides & Annotations`, `MCP Rate Limiting` to the rest of the system?**
  _78 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Pages & UI` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Documentation & Concepts` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._