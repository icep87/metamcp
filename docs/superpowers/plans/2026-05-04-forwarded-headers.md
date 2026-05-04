# Per-Endpoint Header Forwarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow each MetaMCP endpoint to declare an allowlist of header names that are captured from incoming client requests and forwarded to all downstream HTTP-based MCP servers for the lifetime of that session.

**Architecture:** A `forwarded_headers` column on the `endpointsTable` stores the allowlist. At session open, the route handler filters `req.headers` by that list and stores the result in an in-memory `sessionHeadersStore`. The filtered headers flow down through `MetaMcpServerPool → createServer → McpServerPool.getSession → connectMetaMcpClient`, where they are merged into the downstream SSE/StreamableHTTP transport headers (DB config wins on collision). Sessions with non-empty forwarded headers bypass the idle pool and always create fresh downstream connections.

**Tech Stack:** TypeScript, Drizzle ORM (postgres), tRPC, Express 5, `@modelcontextprotocol/sdk`, React 19 + Next.js 15 App Router, pnpm/turbo monorepo

---

### Task 1: DB schema — add `forwarded_headers` column

**Files:**
- Modify: `apps/backend/src/db/schema.ts`

- [ ] **Step 1: Add column to `endpointsTable`**

In `apps/backend/src/db/schema.ts`, find `endpointsTable` and add after the `use_query_param_auth` field (line ~265):

```ts
forwarded_headers: text("forwarded_headers")
  .array()
  .notNull()
  .default(sql`'{}'::text[]`),
```

The full block around it should look like:

```ts
use_query_param_auth: boolean("use_query_param_auth")
  .notNull()
  .default(false),
forwarded_headers: text("forwarded_headers")
  .array()
  .notNull()
  .default(sql`'{}'::text[]`),
created_at: timestamp("created_at", { withTimezone: true })
```

- [ ] **Step 2: Generate and apply migration**

```bash
cd apps/backend && pnpm db:generate:dev && pnpm db:migrate:dev
```

Expected: new migration file in `apps/backend/drizzle/` and migration applied successfully.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/db/schema.ts apps/backend/drizzle/
git commit -m "feat: add forwarded_headers column to endpoints table"
```

---

### Task 2: Zod types — add `forwarded_headers` to all endpoint schemas

**Files:**
- Modify: `packages/zod-types/src/endpoints.zod.ts`

- [ ] **Step 1: Add to `createEndpointFormSchema`**

After `useQueryParamAuth: z.boolean(),` in `createEndpointFormSchema`:
```ts
forwardedHeaders: z.array(z.string()).default([]),
```

- [ ] **Step 2: Add to `editEndpointFormSchema`**

After `useQueryParamAuth: z.boolean().optional(),` in `editEndpointFormSchema`:
```ts
forwardedHeaders: z.array(z.string()).default([]),
```

- [ ] **Step 3: Add to `CreateEndpointRequestSchema`**

After `useQueryParamAuth: z.boolean().default(false),`:
```ts
forwardedHeaders: z.array(z.string()).default([]),
```

- [ ] **Step 4: Add to `UpdateEndpointRequestSchema`**

After `useQueryParamAuth: z.boolean().optional(),`:
```ts
forwardedHeaders: z.array(z.string()).default([]),
```

- [ ] **Step 5: Add to `EndpointSchema`**

After `use_query_param_auth: z.boolean(),`:
```ts
forwarded_headers: z.array(z.string()).default([]),
```

- [ ] **Step 6: Add to `EndpointCreateInputSchema`**

After `use_query_param_auth: z.boolean().optional().default(false),`:
```ts
forwarded_headers: z.array(z.string()).optional().default([]),
```

- [ ] **Step 7: Add to `EndpointUpdateInputSchema`**

After `use_query_param_auth: z.boolean().optional(),`:
```ts
forwarded_headers: z.array(z.string()).optional(),
```

- [ ] **Step 8: Add to `DatabaseEndpointSchema`**

After `use_query_param_auth: z.boolean(),`:
```ts
forwarded_headers: z.array(z.string()).default([]),
```

- [ ] **Step 9: Run type check to verify**

```bash
cd /path/to/repo && pnpm check-types
```

Expected: no errors in zod-types package.

- [ ] **Step 10: Commit**

```bash
git add packages/zod-types/src/endpoints.zod.ts
git commit -m "feat: add forwarded_headers to endpoint zod schemas"
```

---

### Task 3: Serializer and repository — persist and return `forwarded_headers`

**Files:**
- Modify: `apps/backend/src/db/serializers/endpoints.serializer.ts`
- Modify: `apps/backend/src/db/repositories/endpoints.repo.ts`

- [ ] **Step 1: Update serializer `serializeEndpoint`**

In `apps/backend/src/db/serializers/endpoints.serializer.ts`, add to the return object of `serializeEndpoint` after `use_query_param_auth`:

```ts
forwarded_headers: dbEndpoint.forwarded_headers ?? [],
```

Do the same inside `serializeEndpointWithNamespace`.

- [ ] **Step 2: Update repository `create`**

In `apps/backend/src/db/repositories/endpoints.repo.ts`, in the `create` method `.values({...})` block, add:

```ts
forwarded_headers: input.forwarded_headers ?? [],
```

- [ ] **Step 3: Update repository `update`**

In the `update` method `.set({...})` block, add:

```ts
forwarded_headers: input.forwarded_headers ?? [],
```

- [ ] **Step 4: Update all `db.select({...})` blocks to include `forwarded_headers`**

Every `db.select({...})` in the repository that lists columns must include:

```ts
forwarded_headers: endpointsTable.forwarded_headers,
```

There are 8 queries in this file: `findAll`, `findAllAccessibleToUser`, `findAllAccessibleToUserWithNamespaces`, `findPublicEndpoints`, `findByUserId`, `findAllWithNamespaces`, `findByUuid`, `findByUuidWithNamespace`, `findByName`, `findByNameAndUserId`. Add the field to each.

- [ ] **Step 5: Run type check**

```bash
pnpm check-types
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/db/serializers/endpoints.serializer.ts apps/backend/src/db/repositories/endpoints.repo.ts
git commit -m "feat: persist and return forwarded_headers in endpoint repo and serializer"
```

---

### Task 4: tRPC implementation — thread `forwarded_headers` through create/update

**Files:**
- Modify: `apps/backend/src/trpc/endpoints.impl.ts`

- [ ] **Step 1: Update `create` implementation**

In the `endpointsRepository.create({...})` call, add:

```ts
forwarded_headers: input.forwardedHeaders ?? [],
```

- [ ] **Step 2: Update `update` implementation**

In the `endpointsRepository.update({...})` call, add:

```ts
forwarded_headers: input.forwardedHeaders ?? [],
```

- [ ] **Step 3: Run type check**

```bash
pnpm check-types
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/trpc/endpoints.impl.ts
git commit -m "feat: thread forwarded_headers through endpoint create/update tRPC implementations"
```

---

### Task 5: Session headers store (new module)

**Files:**
- Create: `apps/backend/src/lib/metamcp/session-headers-store.ts`

- [ ] **Step 1: Create the store module**

Create `apps/backend/src/lib/metamcp/session-headers-store.ts`:

```ts
/**
 * In-memory store for per-session forwarded headers.
 * Populated at session open, deleted at session cleanup.
 */

const store = new Map<string, Record<string, string>>();

export const sessionHeadersStore = {
  set(sessionId: string, headers: Record<string, string>): void {
    store.set(sessionId, headers);
  },

  get(sessionId: string): Record<string, string> | undefined {
    return store.get(sessionId);
  },

  delete(sessionId: string): void {
    store.delete(sessionId);
  },

  /**
   * Filter incoming request headers by the endpoint's forwarded_headers allowlist.
   * Returns a Record of only the matching headers, with lowercased keys.
   */
  filterHeaders(
    reqHeaders: Record<string, string | string[] | undefined>,
    allowlist: string[],
  ): Record<string, string> {
    if (!allowlist || allowlist.length === 0) {
      return {};
    }

    const normalized = allowlist.map((h) => h.toLowerCase().trim());
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(reqHeaders)) {
      if (normalized.includes(key.toLowerCase())) {
        // Take first value if array
        if (Array.isArray(value)) {
          if (value[0] !== undefined) result[key.toLowerCase()] = value[0];
        } else if (value !== undefined) {
          result[key.toLowerCase()] = value;
        }
      }
    }

    return result;
  },
};
```

- [ ] **Step 2: Write unit tests**

Create `apps/backend/src/lib/metamcp/__tests__/session-headers-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { sessionHeadersStore } from "../session-headers-store";

describe("sessionHeadersStore", () => {
  beforeEach(() => {
    // Clean up between tests
    sessionHeadersStore.delete("test-session");
  });

  it("stores and retrieves headers by sessionId", () => {
    sessionHeadersStore.set("test-session", { "x-user-id": "alice" });
    expect(sessionHeadersStore.get("test-session")).toEqual({ "x-user-id": "alice" });
  });

  it("returns undefined for unknown sessionId", () => {
    expect(sessionHeadersStore.get("unknown")).toBeUndefined();
  });

  it("deletes headers by sessionId", () => {
    sessionHeadersStore.set("test-session", { "x-user-id": "alice" });
    sessionHeadersStore.delete("test-session");
    expect(sessionHeadersStore.get("test-session")).toBeUndefined();
  });
});

describe("sessionHeadersStore.filterHeaders", () => {
  it("returns only headers in the allowlist", () => {
    const result = sessionHeadersStore.filterHeaders(
      { "x-user-id": "alice", "x-other": "val", authorization: "Bearer tok" },
      ["x-user-id"],
    );
    expect(result).toEqual({ "x-user-id": "alice" });
  });

  it("is case-insensitive for allowlist matching", () => {
    const result = sessionHeadersStore.filterHeaders(
      { "X-User-Id": "alice" },
      ["x-user-id"],
    );
    expect(result).toEqual({ "x-user-id": "alice" });
  });

  it("returns empty object for empty allowlist", () => {
    const result = sessionHeadersStore.filterHeaders(
      { "x-user-id": "alice" },
      [],
    );
    expect(result).toEqual({});
  });

  it("ignores headers not present in request", () => {
    const result = sessionHeadersStore.filterHeaders(
      { "x-other": "val" },
      ["x-user-id"],
    );
    expect(result).toEqual({});
  });

  it("takes first value when header is an array", () => {
    const result = sessionHeadersStore.filterHeaders(
      { "x-user-id": ["alice", "bob"] },
      ["x-user-id"],
    );
    expect(result).toEqual({ "x-user-id": "alice" });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd apps/backend && pnpm test
```

Expected: all tests in `session-headers-store.test.ts` pass.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/lib/metamcp/session-headers-store.ts apps/backend/src/lib/metamcp/__tests__/session-headers-store.test.ts
git commit -m "feat: add session-headers-store for per-session forwarded headers"
```

---

### Task 6: `connectMetaMcpClient` — accept and merge forwarded headers

**Files:**
- Modify: `apps/backend/src/lib/metamcp/client.ts`

- [ ] **Step 1: Update `createMetaMcpClient` signature and SSE branch**

In `apps/backend/src/lib/metamcp/client.ts`, update `createMetaMcpClient`:

```ts
export const createMetaMcpClient = (
  serverParams: ServerParameters,
  forwardedHeaders?: Record<string, string>,
): { client: Client | undefined; transport: Transport | undefined } => {
```

In the `SSE` branch, update the headers block:

```ts
// Build headers: forwarded first (lowest priority), then DB config, then auth
const headers: Record<string, string> = {
  ...(forwardedHeaders || {}),
  ...(serverParams.headers || {}),
};
```

(The auth token block that follows remains unchanged — it overwrites `Authorization` last, DB wins.)

In the `STREAMABLE_HTTP` branch, apply the same change:

```ts
// Build headers: forwarded first (lowest priority), then DB config, then auth
const headers: Record<string, string> = {
  ...(forwardedHeaders || {}),
  ...(serverParams.headers || {}),
};
```

- [ ] **Step 2: Update `connectMetaMcpClient` signature**

```ts
export const connectMetaMcpClient = async (
  serverParams: ServerParameters,
  onProcessCrash?: (exitCode: number | null, signal: string | null) => void,
  forwardedHeaders?: Record<string, string>,
): Promise<ConnectedClient | undefined> => {
```

Find the call to `createMetaMcpClient` inside this function and pass `forwardedHeaders`:

```ts
const { client, transport } = createMetaMcpClient(serverParams, forwardedHeaders);
```

- [ ] **Step 3: Run type check**

```bash
pnpm check-types
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/lib/metamcp/client.ts
git commit -m "feat: thread forwarded headers into downstream MCP client transports"
```

---

### Task 7: `McpServerPool` — bypass idle pool and pass forwarded headers

**Files:**
- Modify: `apps/backend/src/lib/metamcp/mcp-server-pool.ts`

- [ ] **Step 1: Update `getSession` to accept and use `forwardedHeaders`**

In `apps/backend/src/lib/metamcp/mcp-server-pool.ts`, update `getSession`:

```ts
async getSession(
  sessionId: string,
  serverUuid: string,
  params: ServerParameters,
  namespaceUuid?: string,
  forwardedHeaders?: Record<string, string>,
): Promise<ConnectedClient | undefined> {
```

After the early return for existing active sessions, before the idle pool check, add:

```ts
// If this session has forwarded headers and the server is HTTP-based,
// bypass the idle pool and always create a fresh connection so headers are included.
const hasForwardedHeaders =
  forwardedHeaders && Object.keys(forwardedHeaders).length > 0;
const isHttpTransport =
  params.type === "SSE" || params.type === "STREAMABLE_HTTP";

if (hasForwardedHeaders && isHttpTransport) {
  const newClient = await this.createNewConnection(
    params,
    namespaceUuid,
    forwardedHeaders,
  );
  if (!newClient) {
    return undefined;
  }

  if (!this.activeSessions[sessionId]) {
    this.activeSessions[sessionId] = {};
    this.sessionToServers[sessionId] = new Set();
    this.sessionTimestamps[sessionId] = Date.now();
  }

  this.activeSessions[sessionId][serverUuid] = newClient;
  this.sessionToServers[sessionId].add(serverUuid);
  return newClient;
}
```

- [ ] **Step 2: Update `createNewConnection` to accept and pass `forwardedHeaders`**

```ts
private async createNewConnection(
  params: ServerParameters,
  namespaceUuid?: string,
  forwardedHeaders?: Record<string, string>,
): Promise<ConnectedClient | undefined> {
```

Update the call to `connectMetaMcpClient` inside:

```ts
const connectedClient = await connectMetaMcpClient(
  params,
  (exitCode, signal) => {
    // ... existing crash handler (unchanged)
  },
  forwardedHeaders,
);
```

- [ ] **Step 3: Run type check**

```bash
pnpm check-types
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/lib/metamcp/mcp-server-pool.ts
git commit -m "feat: bypass idle pool for sessions with forwarded headers in McpServerPool"
```

---

### Task 8: `MetaMCPHandlerContext` and `createServer` — thread headers through proxy

**Files:**
- Modify: `apps/backend/src/lib/metamcp/metamcp-middleware/functional-middleware.ts`
- Modify: `apps/backend/src/lib/metamcp/metamcp-proxy.ts`

- [ ] **Step 1: Add `forwardedHeaders` to `MetaMCPHandlerContext`**

In `apps/backend/src/lib/metamcp/metamcp-middleware/functional-middleware.ts`, update the interface:

```ts
export interface MetaMCPHandlerContext {
  namespaceUuid: string;
  sessionId: string;
  forwardedHeaders?: Record<string, string>;
}
```

- [ ] **Step 2: Update `createServer` signature**

In `apps/backend/src/lib/metamcp/metamcp-proxy.ts`, update the export:

```ts
export const createServer = async (
  namespaceUuid: string,
  sessionId: string,
  includeInactiveServers: boolean = false,
  forwardedHeaders?: Record<string, string>,
) => {
```

- [ ] **Step 3: Update `handlerContext` creation in `createServer`**

```ts
const handlerContext: MetaMCPHandlerContext = {
  namespaceUuid,
  sessionId,
  forwardedHeaders,
};
```

- [ ] **Step 4: Thread `forwardedHeaders` into every `mcpServerPool.getSession()` call**

Inside `createServer`, find every call to `mcpServerPool.getSession(...)`. Each passes `context.sessionId`, `mcpServerUuid`, `params`, `namespaceUuid`. Add `context.forwardedHeaders` as the fifth argument:

```ts
const session = await mcpServerPool.getSession(
  context.sessionId,
  mcpServerUuid,
  params,
  namespaceUuid,
  context.forwardedHeaders,
);
```

Search for all occurrences of `mcpServerPool.getSession` in this file and update each one.

- [ ] **Step 5: Run type check**

```bash
pnpm check-types
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/lib/metamcp/metamcp-middleware/functional-middleware.ts apps/backend/src/lib/metamcp/metamcp-proxy.ts
git commit -m "feat: thread forwarded headers through MetaMCPHandlerContext and createServer"
```

---

### Task 9: `MetaMcpServerPool` — thread `forwardedHeaders` through pool

**Files:**
- Modify: `apps/backend/src/lib/metamcp/metamcp-server-pool.ts`

- [ ] **Step 1: Update `getServer` signature**

```ts
async getServer(
  sessionId: string,
  namespaceUuid: string,
  forwardedHeaders?: Record<string, string>,
  includeInactiveServers: boolean = false,
): Promise<MetaMcpServerInstance | undefined> {
```

Note: the existing callers pass `includeInactiveServers` as the third positional arg. Check all call sites of `getServer` and update them to use the new signature. There are two callers in the public-metamcp route handlers (task 10) and internal calls in `MetaMcpServerPool` itself.

Internal calls within `MetaMcpServerPool` (e.g. `getOpenApiServer`, `invalidateIdleServer`) don't have forwarded headers — pass `undefined` or use the default.

- [ ] **Step 2: Update `createNewServer` signature**

```ts
private async createNewServer(
  sessionId: string,
  namespaceUuid: string,
  includeInactiveServers: boolean = false,
  forwardedHeaders?: Record<string, string>,
): Promise<MetaMcpServerInstance | undefined> {
```

Update the call to `createServer` inside:

```ts
const serverInstance = await createServer(
  namespaceUuid,
  sessionId,
  includeInactiveServers,
  forwardedHeaders,
);
```

- [ ] **Step 3: Pass `forwardedHeaders` through `getServer` to `createNewServer`**

In `getServer`, the path that calls `createNewServer` directly (no idle server available):

```ts
const newServer = await this.createNewServer(
  sessionId,
  namespaceUuid,
  includeInactiveServers,
  forwardedHeaders,
);
```

The idle server path (converting idle to active) does NOT pass forwarded headers — idle servers were created without session context and are only used when `forwardedHeaders` is empty (handled in `McpServerPool.getSession` in task 7).

- [ ] **Step 4: Run type check**

```bash
pnpm check-types
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/lib/metamcp/metamcp-server-pool.ts
git commit -m "feat: thread forwardedHeaders through MetaMcpServerPool"
```

---

### Task 10: Route handlers — capture and inject forwarded headers at session open

**Files:**
- Modify: `apps/backend/src/routers/public-metamcp/sse.ts`
- Modify: `apps/backend/src/routers/public-metamcp/streamable-http.ts`

- [ ] **Step 1: Update SSE route handler**

In `apps/backend/src/routers/public-metamcp/sse.ts`, add the import:

```ts
import { sessionHeadersStore } from "../../lib/metamcp/session-headers-store";
```

In the GET `/:endpoint_name/sse` handler, after `const sessionId = webAppTransport.sessionId;` and before `metaMcpServerPool.getServer(...)`:

```ts
// Capture and store forwarded headers for this session
const allowlist: string[] = authReq.endpoint?.forwarded_headers ?? [];
const forwardedHeaders = sessionHeadersStore.filterHeaders(
  req.headers as Record<string, string | string[] | undefined>,
  allowlist,
);
if (Object.keys(forwardedHeaders).length > 0) {
  sessionHeadersStore.set(sessionId, forwardedHeaders);
}
```

Update the `metaMcpServerPool.getServer(...)` call to pass `forwardedHeaders`:

```ts
const mcpServerInstance = await metaMcpServerPool.getServer(
  sessionId,
  namespaceUuid,
  forwardedHeaders,
);
```

In `cleanupSession`, after `metaMcpServerPool.cleanupSession(sessionId)`:

```ts
sessionHeadersStore.delete(sessionId);
```

- [ ] **Step 2: Update `ApiKeyAuthenticatedRequest` type to include `endpoint`**

Check `apps/backend/src/middleware/api-key-oauth.middleware.ts` for the `ApiKeyAuthenticatedRequest` interface. Add `endpoint` if not already present:

```ts
endpoint?: import("@repo/zod-types").DatabaseEndpoint;
```

(It may already exist since `lookupEndpoint` middleware sets `authReq.endpoint`. Verify before adding.)

- [ ] **Step 3: Update StreamableHTTP route handler**

In `apps/backend/src/routers/public-metamcp/streamable-http.ts`, add the import:

```ts
import { sessionHeadersStore } from "../../lib/metamcp/session-headers-store";
```

In the POST `/:endpoint_name/mcp` handler, in the `if (!sessionId)` branch, after `const newSessionId = randomUUID();` and before `metaMcpServerPool.getServer(...)`:

```ts
// Capture and store forwarded headers for this session
const allowlist: string[] = authReq.endpoint?.forwarded_headers ?? [];
const forwardedHeaders = sessionHeadersStore.filterHeaders(
  req.headers as Record<string, string | string[] | undefined>,
  allowlist,
);
if (Object.keys(forwardedHeaders).length > 0) {
  sessionHeadersStore.set(newSessionId, forwardedHeaders);
}
```

Update the `metaMcpServerPool.getServer(...)` call:

```ts
const mcpServerInstance = await metaMcpServerPool.getServer(
  newSessionId,
  namespaceUuid,
  forwardedHeaders,
);
```

In `cleanupSession`, after `metaMcpServerPool.cleanupSession(sessionId)`:

```ts
sessionHeadersStore.delete(sessionId);
```

- [ ] **Step 4: Run type check**

```bash
pnpm check-types
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/routers/public-metamcp/sse.ts apps/backend/src/routers/public-metamcp/streamable-http.ts
git commit -m "feat: capture forwarded headers at session open in public endpoint route handlers"
```

---

### Task 11: Check `ApiKeyAuthenticatedRequest` type

**Files:**
- Modify (if needed): `apps/backend/src/middleware/api-key-oauth.middleware.ts`

- [ ] **Step 1: Verify `endpoint` field is typed on `ApiKeyAuthenticatedRequest`**

Open `apps/backend/src/middleware/api-key-oauth.middleware.ts` and find the `ApiKeyAuthenticatedRequest` interface. Confirm it has:

```ts
endpoint?: DatabaseEndpoint;
```

If it's typed as `any` or uses a looser type, update it to use `DatabaseEndpoint` from `@repo/zod-types`. The `lookupEndpoint` middleware already sets `authReq.endpoint = endpoint` (line 30 of `lookup-endpoint-middleware.ts`), so this is about getting correct TypeScript types in route handlers.

- [ ] **Step 2: Run type check**

```bash
pnpm check-types
```

Expected: no errors.

- [ ] **Step 3: Commit if changed**

```bash
git add apps/backend/src/middleware/api-key-oauth.middleware.ts
git commit -m "fix: type endpoint field on ApiKeyAuthenticatedRequest"
```

---

### Task 12: Frontend — add `forwardedHeaders` field to edit endpoint form

**Files:**
- Modify: `apps/frontend/components/edit-endpoint.tsx`

- [ ] **Step 1: Read the existing form to understand its structure**

Read `apps/frontend/components/edit-endpoint.tsx` lines 60-200 to understand how other fields (e.g. description, rate limits) are rendered before adding a new field.

- [ ] **Step 2: Add `forwardedHeaders` state and form field**

The form uses `react-hook-form` with the `editEndpointFormSchema`. Since we added `forwardedHeaders: z.array(z.string()).default([])` to the schema, the form now accepts this field.

Find where the form renders rate-limit or auth fields and add after the last field (before the footer/submit button), a new field for forwarded headers. Add a label, a text input where the user enters comma-separated header names, and populate the default value from `endpoint.forwarded_headers` (joined by `, `).

Because `react-hook-form` works with arrays via Controller, and the schema expects `string[]`, the simplest approach is to store it as a comma-separated string in local state and convert on submit.

Add a `useState` for the raw string:

```tsx
const [forwardedHeadersInput, setForwardedHeadersInput] = useState<string>(
  endpoint?.forwarded_headers?.join(", ") ?? "",
);
```

Reset it in the `useEffect` that resets the form when `endpoint` changes:

```tsx
setForwardedHeadersInput(endpoint?.forwarded_headers?.join(", ") ?? "");
```

In the submit handler, parse and include in the update payload:

```ts
const forwardedHeaders = forwardedHeadersInput
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter((h) => h.length > 0);
```

Add `forwardedHeaders` to the `updateEndpoint.mutate({...})` call.

Add the JSX field (place it near the description field or as the last field before the submit button):

```tsx
<div className="space-y-2">
  <Label htmlFor="forwardedHeaders">
    {t("endpoints:forwardedHeaders.label")}
  </Label>
  <Input
    id="forwardedHeaders"
    value={forwardedHeadersInput}
    onChange={(e) => setForwardedHeadersInput(e.target.value)}
    placeholder="x-user-id, x-session-token"
  />
  <p className="text-sm text-muted-foreground">
    {t("endpoints:forwardedHeaders.description")}
  </p>
</div>
```

- [ ] **Step 3: Add translation keys**

In `apps/frontend/public/locales/en/endpoints.json`, add:

```json
"forwardedHeaders": {
  "label": "Forwarded Headers",
  "description": "Comma-separated list of header names to forward from client requests to downstream MCP servers (e.g. x-user-id, x-session-token)."
}
```

Add the same keys to `apps/frontend/public/locales/ko/endpoints.json` and `apps/frontend/public/locales/zh/endpoints.json` (use the English values as fallback — translation team can update later).

- [ ] **Step 4: Run type check and build**

```bash
pnpm check-types
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/components/edit-endpoint.tsx apps/frontend/public/locales/en/endpoints.json apps/frontend/public/locales/ko/endpoints.json apps/frontend/public/locales/zh/endpoints.json
git commit -m "feat: add forwarded headers field to edit endpoint form"
```

---

### Task 13: Final type check and test run

- [ ] **Step 1: Full type check**

```bash
pnpm check-types
```

Expected: zero errors across all packages.

- [ ] **Step 2: Run backend tests**

```bash
cd apps/backend && pnpm test
```

Expected: all tests pass including the new `session-headers-store.test.ts`.

- [ ] **Step 3: Run lint**

```bash
pnpm lint
```

Expected: zero warnings (max-warnings 0 enforced).

- [ ] **Step 4: Final commit if any lint fixes needed**

```bash
git add -A
git commit -m "fix: resolve lint warnings from header forwarding feature"
```
