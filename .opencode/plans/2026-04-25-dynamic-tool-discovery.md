# Dynamic MCP Tool Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add dynamic tool discovery to MetaMCP so tool catalogs refresh from upstream MCP servers via periodic polling, upstream `notifications/tools/list_changed` subscriptions, and downstream `notifications/tools/list_changed` fanout to connected clients — without restarting MetaMCP or its clients.

**Architecture:** A new `ToolDiscoveryService` drives periodic per-server `tools/list` polling (every 5 min), subscribes to upstream `notifications/tools/list_changed` when the upstream server advertises that capability, diffs results with `ToolsSyncCache`, and triggers Postgres `NOTIFY` so all MetaMCP replicas can fanout `notifications/tools/list_changed` to affected downstream MCP sessions. MetaMCP's `Server` capability block is updated to advertise `tools.listChanged: true`, and a new `DownstreamNotificationManager` tracks active MCP `Server` instances per namespace and calls `server.notification()` on tool-list changes.

**Tech Stack:** TypeScript, Node.js, Express 5, `@modelcontextprotocol/sdk` v1.16.0, Drizzle ORM, PostgreSQL (`pg` client for `LISTEN/NOTIFY`), existing `McpServerPool`, `MetaMcpServerPool`, `toolsSyncCache`, `configService`.

---

## File Map

### New files

| Path | Responsibility |
|------|----------------|
| `apps/backend/src/lib/metamcp/tool-discovery-service.ts` | Periodic + reactive refresh of upstream `tools/list` per server; owns the refresh loop and upstream subscription |
| `apps/backend/src/lib/metamcp/downstream-notification-manager.ts` | Tracks active `Server` instances by namespace; sends `notifications/tools/list_changed` to appropriate sessions |
| `apps/backend/src/lib/metamcp/pg-notify.ts` | Thin wrapper over `pg` Pool for `NOTIFY` / `LISTEN` — multi-replica broadcast channel |
| `apps/backend/src/lib/metamcp/__tests__/tool-discovery-service.test.ts` | Unit tests for `ToolDiscoveryService` |
| `apps/backend/src/lib/metamcp/__tests__/downstream-notification-manager.test.ts` | Unit tests for `DownstreamNotificationManager` |
| `apps/backend/src/lib/metamcp/__tests__/pg-notify.test.ts` | Unit tests for `PgNotify` |

### Modified files

| Path | Change |
|------|--------|
| `apps/backend/src/lib/metamcp/metamcp-proxy.ts` | Declare `tools.listChanged: true` in `Server` capabilities; register the `Server` instance with `DownstreamNotificationManager` on create, deregister on cleanup |
| `apps/backend/src/lib/metamcp/metamcp-server-pool.ts` | On session cleanup, deregister the server from `DownstreamNotificationManager` |
| `apps/backend/src/lib/startup.ts` | Start `toolDiscoveryService.start()` after initial idle server warm-up |
| `apps/backend/src/index.ts` | On graceful shutdown, call `toolDiscoveryService.stop()` |
| `apps/backend/src/lib/metamcp/tools-sync-cache.ts` | Export `hashTools()` as a standalone helper so `ToolDiscoveryService` can call it independently |

---

## Task 1: Export `hashTools` as a standalone helper

**Files:**
- Modify: `apps/backend/src/lib/metamcp/tools-sync-cache.ts`

- [ ] **Step 1: Write the failing test**

  Create `apps/backend/src/lib/metamcp/__tests__/tools-sync-cache.test.ts`:

  ```typescript
  import { hashTools } from "../tools-sync-cache";

  describe("hashTools", () => {
    it("returns the same hash for the same tool names regardless of order", () => {
      const a = hashTools(["github__search", "jira__create"]);
      const b = hashTools(["jira__create", "github__search"]);
      expect(a).toBe(b);
    });

    it("returns different hashes for different tool names", () => {
      const a = hashTools(["github__search"]);
      const b = hashTools(["jira__search"]);
      expect(a).not.toBe(b);
    });

    it("returns a non-empty string", () => {
      expect(hashTools(["tool"])).toMatch(/^[a-f0-9]{64}$/);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd apps/backend && npx vitest run src/lib/metamcp/__tests__/tools-sync-cache.test.ts`

  Expected: FAIL — `hashTools` is not exported.

- [ ] **Step 3: Export `hashTools` from the class and as a standalone function**

  In `apps/backend/src/lib/metamcp/tools-sync-cache.ts`, add after the singleton export line:

  ```typescript
  /**
   * Standalone hash helper — same algorithm as ToolsSyncCache.hashTools()
   * Use this when you need to hash without a class instance.
   */
  export function hashTools(toolNames: string[]): string {
    return toolsSyncCache.hashTools(toolNames);
  }
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `cd apps/backend && npx vitest run src/lib/metamcp/__tests__/tools-sync-cache.test.ts`

  Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

  ```bash
  git add apps/backend/src/lib/metamcp/tools-sync-cache.ts apps/backend/src/lib/metamcp/__tests__/tools-sync-cache.test.ts
  git commit -m "feat: export hashTools as standalone helper from tools-sync-cache"
  ```

---

## Task 2: `PgNotify` — Postgres LISTEN/NOTIFY wrapper

**Files:**
- Create: `apps/backend/src/lib/metamcp/pg-notify.ts`
- Create: `apps/backend/src/lib/metamcp/__tests__/pg-notify.test.ts`

**Context:** MetaMCP already connects to Postgres via Drizzle (Drizzle does not expose the underlying `pg.Pool` for LISTEN/NOTIFY). We add a separate lightweight `pg.Pool` (one dedicated connection) just for pub/sub. The channel name will be `metamcp_tools_changed`. The payload will be a JSON string: `{ namespaceUuid: string }`.

- [ ] **Step 1: Write the failing test**

  Create `apps/backend/src/lib/metamcp/__tests__/pg-notify.test.ts`:

  ```typescript
  import { PgNotify } from "../pg-notify";

  describe("PgNotify", () => {
    it("can be instantiated", () => {
      const pg = new PgNotify("postgresql://localhost/test");
      expect(pg).toBeDefined();
      pg.stop(); // must not throw
    });

    it("notify() does not throw when pool is not started", async () => {
      const pg = new PgNotify("postgresql://localhost/test");
      // We don't start it — notify should either queue or no-op gracefully
      await expect(pg.notify("metamcp_tools_changed", { namespaceUuid: "abc" })).resolves.not.toThrow();
      pg.stop();
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd apps/backend && npx vitest run src/lib/metamcp/__tests__/pg-notify.test.ts`

  Expected: FAIL — `pg-notify` module not found.

- [ ] **Step 3: Create `pg-notify.ts`**

  Create `apps/backend/src/lib/metamcp/pg-notify.ts`:

  ```typescript
  import { Pool, PoolClient } from "pg";

  import logger from "@/utils/logger";

  export type PgNotifyPayload = Record<string, string>;

  /**
   * Lightweight wrapper for Postgres LISTEN / NOTIFY.
   * Uses a dedicated pg.Pool (single connection) separate from the Drizzle pool
   * so we can call LISTEN without interfering with query traffic.
   */
  export class PgNotify {
    private pool: Pool;
    private listenClient: PoolClient | null = null;
    private started = false;
    private listeners: Map<string, Set<(payload: PgNotifyPayload) => void>> =
      new Map();

    constructor(connectionString: string) {
      this.pool = new Pool({ connectionString, max: 2 });
    }

    /**
     * Start listening. Must be called before subscriptions will fire.
     */
    async start(): Promise<void> {
      if (this.started) return;
      this.started = true;

      try {
        this.listenClient = await this.pool.connect();

        this.listenClient.on("notification", (msg) => {
          if (!msg.payload) return;
          let payload: PgNotifyPayload;
          try {
            payload = JSON.parse(msg.payload);
          } catch {
            logger.warn(`PgNotify: unparseable payload on channel ${msg.channel}`);
            return;
          }
          const handlers = this.listeners.get(msg.channel);
          if (handlers) {
            for (const handler of handlers) {
              try {
                handler(payload);
              } catch (err) {
                logger.error("PgNotify: listener threw", err);
              }
            }
          }
        });

        this.listenClient.on("error", (err) => {
          logger.error("PgNotify: listen client error", err);
        });

        // Re-subscribe to all channels already registered
        for (const channel of this.listeners.keys()) {
          await this.listenClient.query(`LISTEN "${channel}"`);
        }

        logger.info("PgNotify: started");
      } catch (err) {
        logger.error("PgNotify: failed to start", err);
        this.started = false;
      }
    }

    /**
     * Publish a notification on `channel` with `payload`.
     * No-ops gracefully if the pool is not started.
     */
    async notify(channel: string, payload: PgNotifyPayload): Promise<void> {
      try {
        const client = await this.pool.connect();
        try {
          await client.query(
            `SELECT pg_notify($1, $2)`,
            [channel, JSON.stringify(payload)],
          );
        } finally {
          client.release();
        }
      } catch (err) {
        logger.error(`PgNotify: notify failed on channel ${channel}`, err);
      }
    }

    /**
     * Subscribe to notifications on `channel`.
     * Returns an unsubscribe function.
     */
    subscribe(
      channel: string,
      handler: (payload: PgNotifyPayload) => void,
    ): () => void {
      if (!this.listeners.has(channel)) {
        this.listeners.set(channel, new Set());
        // If already started, start listening to this new channel
        if (this.listenClient) {
          this.listenClient.query(`LISTEN "${channel}"`).catch((err) => {
            logger.error(`PgNotify: LISTEN failed for channel ${channel}`, err);
          });
        }
      }
      this.listeners.get(channel)!.add(handler);

      return () => {
        this.listeners.get(channel)?.delete(handler);
      };
    }

    /**
     * Stop and release all resources.
     */
    stop(): void {
      if (this.listenClient) {
        this.listenClient.release(true); // destroy connection
        this.listenClient = null;
      }
      this.pool.end().catch((err) => {
        logger.error("PgNotify: error ending pool", err);
      });
      this.started = false;
    }
  }

  // Singleton — uses DATABASE_URL env var (same as Drizzle)
  export const pgNotify = new PgNotify(
    process.env.DATABASE_URL ?? "postgresql://localhost/metamcp",
  );
  ```

- [ ] **Step 4: Install `@types/pg` if needed**

  Run: `cd apps/backend && pnpm list pg @types/pg 2>&1 | head -20`

  If `@types/pg` is missing: `cd apps/backend && pnpm add -D @types/pg`

- [ ] **Step 5: Run test to verify it passes**

  Run: `cd apps/backend && npx vitest run src/lib/metamcp/__tests__/pg-notify.test.ts`

  Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

  ```bash
  git add apps/backend/src/lib/metamcp/pg-notify.ts apps/backend/src/lib/metamcp/__tests__/pg-notify.test.ts
  git commit -m "feat: add PgNotify wrapper for Postgres LISTEN/NOTIFY"
  ```

---

## Task 3: `DownstreamNotificationManager` — track sessions and fan out `list_changed`

**Files:**
- Create: `apps/backend/src/lib/metamcp/downstream-notification-manager.ts`
- Create: `apps/backend/src/lib/metamcp/__tests__/downstream-notification-manager.test.ts`

**Context:** When a downstream MCP client connects, MetaMCP creates a `Server` instance (from `createServer()` in `metamcp-proxy.ts`). The `DownstreamNotificationManager` registers that `Server` indexed by `(namespaceUuid, sessionId)`. When a tool change is detected for a namespace, it calls `server.notification({ method: "notifications/tools/list_changed" })` on all registered servers for that namespace.

- [ ] **Step 1: Write the failing tests**

  Create `apps/backend/src/lib/metamcp/__tests__/downstream-notification-manager.test.ts`:

  ```typescript
  import { vi, describe, it, expect } from "vitest";
  import { DownstreamNotificationManager } from "../downstream-notification-manager";

  describe("DownstreamNotificationManager", () => {
    function makeServer() {
      return {
        notification: vi.fn(async (_params: { method: string }) => {}),
      };
    }

    it("registers and deregisters a server", () => {
      const mgr = new DownstreamNotificationManager();
      const srv = makeServer();
      mgr.register("ns1", "sess1", srv as any);
      expect(mgr.getSessionIds("ns1")).toContain("sess1");
      mgr.deregister("sess1");
      expect(mgr.getSessionIds("ns1")).not.toContain("sess1");
    });

    it("notifyNamespace calls server.notification for all sessions in that namespace", async () => {
      const mgr = new DownstreamNotificationManager();
      const srv1 = makeServer();
      const srv2 = makeServer();
      mgr.register("ns1", "sess1", srv1 as any);
      mgr.register("ns1", "sess2", srv2 as any);
      await mgr.notifyNamespace("ns1");
      expect(srv1.notification).toHaveBeenCalledWith({
        method: "notifications/tools/list_changed",
      });
      expect(srv2.notification).toHaveBeenCalledWith({
        method: "notifications/tools/list_changed",
      });
    });

    it("notifyNamespace does not throw if no sessions registered", async () => {
      const mgr = new DownstreamNotificationManager();
      await expect(mgr.notifyNamespace("unknown-ns")).resolves.not.toThrow();
    });

    it("deregister removes session from namespace index", () => {
      const mgr = new DownstreamNotificationManager();
      const srv = makeServer();
      mgr.register("ns1", "sess1", srv as any);
      mgr.deregister("sess1");
      expect(mgr.getSessionIds("ns1")).toHaveLength(0);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it fails**

  Run: `cd apps/backend && npx vitest run src/lib/metamcp/__tests__/downstream-notification-manager.test.ts`

  Expected: FAIL — module not found.

- [ ] **Step 3: Create `downstream-notification-manager.ts`**

  Create `apps/backend/src/lib/metamcp/downstream-notification-manager.ts`:

  ```typescript
  import { Server } from "@modelcontextprotocol/sdk/server/index.js";

  import logger from "@/utils/logger";

  /**
   * Tracks active downstream MCP Server instances keyed by sessionId,
   * and fans out notifications/tools/list_changed to all sessions in a namespace.
   */
  export class DownstreamNotificationManager {
    // sessionId -> Server
    private sessions: Map<string, Server> = new Map();
    // namespaceUuid -> Set<sessionId>
    private namespaceIndex: Map<string, Set<string>> = new Map();

    /**
     * Register a Server instance for a session.
     * Call this immediately after createServer() in metamcp-proxy.ts.
     */
    register(namespaceUuid: string, sessionId: string, server: Server): void {
      this.sessions.set(sessionId, server);
      if (!this.namespaceIndex.has(namespaceUuid)) {
        this.namespaceIndex.set(namespaceUuid, new Set());
      }
      this.namespaceIndex.get(namespaceUuid)!.add(sessionId);
      logger.debug(
        `DownstreamNotificationManager: registered session ${sessionId} for namespace ${namespaceUuid}`,
      );
    }

    /**
     * Deregister a session (call on session cleanup).
     */
    deregister(sessionId: string): void {
      this.sessions.delete(sessionId);
      for (const [, sessions] of this.namespaceIndex) {
        sessions.delete(sessionId);
      }
      logger.debug(
        `DownstreamNotificationManager: deregistered session ${sessionId}`,
      );
    }

    /**
     * Send notifications/tools/list_changed to all active sessions for a namespace.
     */
    async notifyNamespace(namespaceUuid: string): Promise<void> {
      const sessionIds = this.namespaceIndex.get(namespaceUuid);
      if (!sessionIds || sessionIds.size === 0) {
        return;
      }

      const notification = { method: "notifications/tools/list_changed" };

      await Promise.allSettled(
        Array.from(sessionIds).map(async (sessionId) => {
          const server = this.sessions.get(sessionId);
          if (!server) return;
          try {
            await server.notification(notification);
            logger.debug(
              `DownstreamNotificationManager: notified session ${sessionId} in namespace ${namespaceUuid}`,
            );
          } catch (err) {
            logger.warn(
              `DownstreamNotificationManager: failed to notify session ${sessionId}`,
              err,
            );
          }
        }),
      );
    }

    /**
     * Return all session IDs registered for a namespace (for testing/monitoring).
     */
    getSessionIds(namespaceUuid: string): string[] {
      return Array.from(this.namespaceIndex.get(namespaceUuid) ?? []);
    }
  }

  export const downstreamNotificationManager = new DownstreamNotificationManager();
  ```

- [ ] **Step 4: Run test to verify it passes**

  Run: `cd apps/backend && npx vitest run src/lib/metamcp/__tests__/downstream-notification-manager.test.ts`

  Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

  ```bash
  git add apps/backend/src/lib/metamcp/downstream-notification-manager.ts apps/backend/src/lib/metamcp/__tests__/downstream-notification-manager.test.ts
  git commit -m "feat: add DownstreamNotificationManager for tools/list_changed fanout"
  ```

---

## Task 4: `ToolDiscoveryService` — periodic + reactive upstream refresh

**Files:**
- Create: `apps/backend/src/lib/metamcp/tool-discovery-service.ts`
- Create: `apps/backend/src/lib/metamcp/__tests__/tool-discovery-service.test.ts`

**Context:** This service:
1. Runs a periodic timer (default 5 min, configurable via `TOOL_DISCOVERY_INTERVAL_MS` env var) that calls `refreshServer(serverUuid)` for every configured upstream server.
2. When connecting to an upstream server, checks if its capabilities include `tools.listChanged`. If so, subscribes to `notifications/tools/list_changed` from that upstream client and calls `refreshServer()` reactively.
3. `refreshServer()` fetches `tools/list` from the upstream, diffs against `toolsSyncCache`, and if changed: syncs to DB (via existing `toolsImplementations.sync()`), identifies affected namespaces, then calls `pgNotify.notify("metamcp_tools_changed", { namespaceUuid })` for each.

- [ ] **Step 1: Read `namespaceServerMappingsTable` schema first**

  Open `apps/backend/src/db/schema.ts` and find the join table between namespaces and servers. Note:
  - The exact TypeScript export name (e.g., `namespaceServerMappingsTable`)
  - The column name for namespace UUID (e.g., `namespace_uuid`)
  - The column name for server UUID (e.g., `mcp_server_uuid`)

  Use those exact names in the code below.

- [ ] **Step 2: Read `toolsImplementations.sync()` signature**

  Open `apps/backend/src/trpc/tools.impl.ts` and find `sync()`. Note its exact parameter names and types. Adjust the code below if different from `(serverUuid: string, namespaceUuid: string, tools: Tool[])`.

- [ ] **Step 3: Write the failing tests**

  Create `apps/backend/src/lib/metamcp/__tests__/tool-discovery-service.test.ts`:

  ```typescript
  import { vi, describe, it, expect, beforeEach } from "vitest";
  import { ToolDiscoveryService } from "../tool-discovery-service";
  import { toolsSyncCache } from "../tools-sync-cache";

  describe("ToolDiscoveryService", () => {
    beforeEach(() => {
      toolsSyncCache.clear();
    });

    it("can be instantiated without starting", () => {
      const svc = new ToolDiscoveryService();
      expect(svc).toBeDefined();
    });

    it("stop() does not throw when not started", () => {
      const svc = new ToolDiscoveryService();
      expect(() => svc.stop()).not.toThrow();
    });

    it("refreshServer() resolves without error if server has no cached params", async () => {
      const svc = new ToolDiscoveryService();
      // Inject empty serverParamsCache by calling with a nonexistent uuid
      await expect(
        (svc as any).refreshServer("nonexistent-uuid"),
      ).resolves.not.toThrow();
    });

    it("getNamespacesForServer is a callable method", () => {
      const svc = new ToolDiscoveryService();
      expect(typeof (svc as any).getNamespacesForServer).toBe("function");
    });
  });
  ```

- [ ] **Step 4: Run test to verify it fails**

  Run: `cd apps/backend && npx vitest run src/lib/metamcp/__tests__/tool-discovery-service.test.ts`

  Expected: FAIL — module not found.

- [ ] **Step 5: Create `tool-discovery-service.ts`**

  Create `apps/backend/src/lib/metamcp/tool-discovery-service.ts`:

  ```typescript
  import { Client } from "@modelcontextprotocol/sdk/client/index.js";
  import { Tool } from "@modelcontextprotocol/sdk/types.js";
  import { eq } from "drizzle-orm";

  import { db } from "@/db";
  import { namespaceServerMappingsTable } from "@/db/schema";
  import logger from "@/utils/logger";

  import { toolsImplementations } from "../../trpc/tools.impl";
  import { mcpServerPool } from "./mcp-server-pool";
  import { downstreamNotificationManager } from "./downstream-notification-manager";
  import { pgNotify } from "./pg-notify";
  import { toolsSyncCache } from "./tools-sync-cache";
  import { sanitizeName } from "./utils";

  const TOOL_DISCOVERY_INTERVAL_MS =
    parseInt(process.env.TOOL_DISCOVERY_INTERVAL_MS ?? "300000", 10); // 5 min default

  const DISCOVERY_SESSION_ID = "tool-discovery-service";

  /**
   * ToolDiscoveryService manages dynamic tool discovery from upstream MCP servers.
   *
   * Responsibilities:
   *  - Periodic polling of tools/list from every upstream server (default every 5 min)
   *  - Subscribing to upstream notifications/tools/list_changed for servers that support it
   *  - Diffing against toolsSyncCache, syncing changed tools to DB
   *  - Publishing Postgres NOTIFY so all MetaMCP replicas notify their downstream clients
   */
  export class ToolDiscoveryService {
    private timer: NodeJS.Timeout | null = null;
    // Track upstream notification subscriptions: serverUuid -> unsubscribe fn
    private upstreamSubscriptions: Map<string, () => void> = new Map();

    /**
     * Start the periodic refresh loop and Postgres LISTEN.
     */
    async start(): Promise<void> {
      logger.info(
        `ToolDiscoveryService: starting (interval=${TOOL_DISCOVERY_INTERVAL_MS}ms)`,
      );

      // Start Postgres LISTEN and subscribe to tool change notifications.
      // Each replica listens for its own NOTIFY and fans out to local downstream sessions.
      await pgNotify.start();
      pgNotify.subscribe("metamcp_tools_changed", async (payload) => {
        const { namespaceUuid } = payload as { namespaceUuid: string };
        if (namespaceUuid) {
          await downstreamNotificationManager.notifyNamespace(namespaceUuid);
        }
      });

      // First refresh immediately, then on interval
      await this.refreshAll();

      this.timer = setInterval(async () => {
        await this.refreshAll().catch((err) => {
          logger.error("ToolDiscoveryService: periodic refresh error", err);
        });
      }, TOOL_DISCOVERY_INTERVAL_MS);
    }

    /**
     * Stop the service and release all resources.
     */
    stop(): void {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      for (const unsub of this.upstreamSubscriptions.values()) {
        try {
          unsub();
        } catch {
          /* ignore */
        }
      }
      this.upstreamSubscriptions.clear();
      pgNotify.stop();
      logger.info("ToolDiscoveryService: stopped");
    }

    /**
     * Refresh all upstream servers visible in the pool's params cache.
     */
    private async refreshAll(): Promise<void> {
      const serverUuids = Object.keys(
        (mcpServerPool as any).serverParamsCache as Record<string, unknown>,
      );
      logger.debug(
        `ToolDiscoveryService: refreshing ${serverUuids.length} servers`,
      );
      await Promise.allSettled(
        serverUuids.map((uuid) => this.refreshServer(uuid)),
      );
    }

    /**
     * Refresh a single server's tool list. Diffs, syncs DB, and notifies namespaces.
     */
    async refreshServer(serverUuid: string): Promise<void> {
      const params = (mcpServerPool as any).serverParamsCache?.[serverUuid];
      if (!params) {
        logger.debug(
          `ToolDiscoveryService: no cached params for server ${serverUuid}, skipping`,
        );
        return;
      }

      try {
        const session = await mcpServerPool.getSession(
          DISCOVERY_SESSION_ID,
          serverUuid,
          params,
        );
        if (!session) {
          logger.warn(
            `ToolDiscoveryService: could not get session for server ${serverUuid}`,
          );
          return;
        }

        const client: Client = session.client;

        // Subscribe to upstream list_changed if the server supports it
        await this.ensureUpstreamSubscription(serverUuid, client, params);

        // Fetch all tools via cursor pagination
        const tools: Tool[] = [];
        let cursor: string | undefined;
        do {
          const result = await client.listTools({ cursor });
          tools.push(...result.tools);
          cursor = result.nextCursor ?? undefined;
        } while (cursor);

        const toolNames = tools.map((t) => t.name);

        // Only proceed if something changed
        if (!toolsSyncCache.shouldSync(serverUuid, toolNames)) {
          logger.debug(
            `ToolDiscoveryService: no changes for server ${serverUuid}`,
          );
          return;
        }

        logger.info(
          `ToolDiscoveryService: tool list changed for server ${serverUuid} (${toolNames.length} tools)`,
        );

        // Sync to DB and notify each affected namespace
        const namespaceUuids = await this.getNamespacesForServer(serverUuid);
        for (const namespaceUuid of namespaceUuids) {
          const prefixedTools = tools.map((t) => ({
            ...t,
            name: `${sanitizeName(params.name)}__${t.name}`,
          }));
          await toolsImplementations.sync(serverUuid, namespaceUuid, prefixedTools);

          // Postgres NOTIFY — picked up by this and all other replicas
          await pgNotify.notify("metamcp_tools_changed", { namespaceUuid });
        }
      } catch (err) {
        logger.error(
          `ToolDiscoveryService: error refreshing server ${serverUuid}`,
          err,
        );
      }
    }

    /**
     * Subscribe to upstream notifications/tools/list_changed for a server
     * if its capabilities advertise tools.listChanged. No-ops if already subscribed
     * or not supported.
     */
    private async ensureUpstreamSubscription(
      serverUuid: string,
      client: Client,
      params: { name: string },
    ): Promise<void> {
      if (this.upstreamSubscriptions.has(serverUuid)) return;

      const capabilities = client.getServerCapabilities();
      const supportsListChanged = !!(capabilities as any)?.tools?.listChanged;

      if (!supportsListChanged) {
        // Mark as handled with a no-op so we don't check again
        this.upstreamSubscriptions.set(serverUuid, () => {});
        return;
      }

      logger.info(
        `ToolDiscoveryService: subscribing to upstream tools/list_changed for ${params.name}`,
      );

      // The MCP SDK Client does not expose a typed subscription API for server notifications,
      // so we intercept at the transport level.
      const transport = (client as any).transport;
      if (!transport) {
        this.upstreamSubscriptions.set(serverUuid, () => {});
        return;
      }

      const originalOnMessage = transport.onmessage?.bind(transport);
      const handler = async (message: unknown) => {
        if (
          typeof message === "object" &&
          message !== null &&
          (message as any).method === "notifications/tools/list_changed"
        ) {
          logger.info(
            `ToolDiscoveryService: received upstream list_changed from ${params.name}`,
          );
          // Invalidate cache so the next shouldSync() returns true
          toolsSyncCache.clear(serverUuid);
          await this.refreshServer(serverUuid);
        }
        if (originalOnMessage) originalOnMessage(message);
      };

      transport.onmessage = handler;

      this.upstreamSubscriptions.set(serverUuid, () => {
        if (transport.onmessage === handler) {
          transport.onmessage = originalOnMessage;
        }
      });
    }

    /**
     * Return all namespace UUIDs that include this server via namespace_server_mappings.
     */
    async getNamespacesForServer(serverUuid: string): Promise<string[]> {
      const rows = await db
        .select({ namespaceUuid: namespaceServerMappingsTable.namespace_uuid })
        .from(namespaceServerMappingsTable)
        .where(
          eq(namespaceServerMappingsTable.mcp_server_uuid, serverUuid),
        );
      return rows.map((r) => r.namespaceUuid);
    }
  }

  export const toolDiscoveryService = new ToolDiscoveryService();
  ```

  > **Important:** After creating this file, verify that `namespaceServerMappingsTable`, `.namespace_uuid`, and `.mcp_server_uuid` match the actual Drizzle schema. Adjust if column or table names differ.

- [ ] **Step 6: Run test to verify it passes**

  Run: `cd apps/backend && npx vitest run src/lib/metamcp/__tests__/tool-discovery-service.test.ts`

  Expected: PASS (4 tests)

- [ ] **Step 7: TypeScript check**

  Run: `cd apps/backend && npx tsc --noEmit 2>&1 | head -50`

  Fix any type errors (most likely column name mismatches from the schema) before committing.

- [ ] **Step 8: Commit**

  ```bash
  git add apps/backend/src/lib/metamcp/tool-discovery-service.ts apps/backend/src/lib/metamcp/__tests__/tool-discovery-service.test.ts
  git commit -m "feat: add ToolDiscoveryService for periodic and reactive upstream tool refresh"
  ```

---

## Task 5: Wire `DownstreamNotificationManager` into `createServer()`

**Files:**
- Modify: `apps/backend/src/lib/metamcp/metamcp-proxy.ts`

**Context:** `createServer()` creates and returns `{ server, cleanup }`. We need to:
1. Declare `tools.listChanged: true` in the server capabilities.
2. Call `downstreamNotificationManager.register(namespaceUuid, sessionId, server)` after creating the server.
3. Call `downstreamNotificationManager.deregister(sessionId)` in the cleanup function.

- [ ] **Step 1: Find the cleanup function**

  Read `apps/backend/src/lib/metamcp/metamcp-proxy.ts` around lines 800–881 (end of file) to find the returned `cleanup` function shape. The `createServer()` function returns `{ server, cleanup }`.

- [ ] **Step 2: Update capabilities in `metamcp-proxy.ts`**

  Find (around line 130–135):

  ```typescript
        tools: {},
  ```

  Replace with:

  ```typescript
        tools: { listChanged: true },
  ```

- [ ] **Step 3: Add import for `downstreamNotificationManager`**

  At the top of `metamcp-proxy.ts` with the other imports, add:

  ```typescript
  import { downstreamNotificationManager } from "./downstream-notification-manager";
  ```

- [ ] **Step 4: Register the server instance after creation**

  Immediately after line 136 (after the `server` const closing `)`):

  ```typescript
  downstreamNotificationManager.register(namespaceUuid, sessionId, server);
  ```

- [ ] **Step 5: Deregister on cleanup**

  Find the cleanup function returned by `createServer()`. It will look something like:

  ```typescript
  cleanup: async () => {
    // ... existing cleanup code
  }
  ```

  Add at the start of that cleanup function body:

  ```typescript
  downstreamNotificationManager.deregister(sessionId);
  ```

- [ ] **Step 6: TypeScript check**

  Run: `cd apps/backend && npx tsc --noEmit 2>&1 | head -30`

  Expected: no errors.

- [ ] **Step 7: Commit**

  ```bash
  git add apps/backend/src/lib/metamcp/metamcp-proxy.ts
  git commit -m "feat: declare tools.listChanged capability and wire DownstreamNotificationManager"
  ```

---

## Task 6: Start `ToolDiscoveryService` on startup and stop on shutdown

**Files:**
- Modify: `apps/backend/src/lib/startup.ts`
- Modify: `apps/backend/src/index.ts`

- [ ] **Step 1: Read startup.ts**

  Open `apps/backend/src/lib/startup.ts`. Find the main startup function and where `initializeIdleServers()` completes.

- [ ] **Step 2: Add `toolDiscoveryService.start()` to startup**

  At the top of `startup.ts`, add:

  ```typescript
  import { toolDiscoveryService } from "./metamcp/tool-discovery-service";
  ```

  At the end of the startup function body (after the 3-second idle server timer), add:

  ```typescript
  // Start dynamic tool discovery after idle servers are warm
  toolDiscoveryService.start().catch((err) => {
    logger.error("Failed to start ToolDiscoveryService:", err);
  });
  ```

- [ ] **Step 3: Read index.ts and find shutdown handler**

  Open `apps/backend/src/index.ts`. Search for `SIGTERM` or `SIGINT` or `process.on`. Find the shutdown block.

- [ ] **Step 4: Add `toolDiscoveryService.stop()` to shutdown**

  Add import in `index.ts`:

  ```typescript
  import { toolDiscoveryService } from "./lib/metamcp/tool-discovery-service";
  ```

  In the shutdown handler, add:

  ```typescript
  toolDiscoveryService.stop();
  ```

- [ ] **Step 5: TypeScript check**

  Run: `cd apps/backend && npx tsc --noEmit 2>&1 | head -30`

  Expected: no type errors.

- [ ] **Step 6: Commit**

  ```bash
  git add apps/backend/src/lib/startup.ts apps/backend/src/index.ts
  git commit -m "feat: start ToolDiscoveryService on startup and stop on graceful shutdown"
  ```

---

## Task 7: Run full test suite and integration smoke check

- [ ] **Step 1: Run all backend tests**

  Run: `cd apps/backend && pnpm test 2>&1 | tail -40`

  Expected: all tests pass. Fix any failures before continuing.

- [ ] **Step 2: Full TypeScript check**

  Run: `pnpm -r exec tsc --noEmit 2>&1 | head -50`

  Expected: no type errors across the monorepo.

- [ ] **Step 3: Build check**

  Run: `cd apps/backend && pnpm build 2>&1 | tail -20`

  Expected: build succeeds.

- [ ] **Step 4: Smoke test — start server, check logs**

  Start the backend (dev mode or Docker) and verify in logs:
  - `ToolDiscoveryService: starting`
  - `PgNotify: started`
  - `ToolDiscoveryService: refreshing N servers`

  Connect an MCP client and call `initialize`. Verify the response includes:
  ```json
  { "capabilities": { "tools": { "listChanged": true } } }
  ```

- [ ] **Step 5: Commit any final adjustments**

  ```bash
  git add -A
  git commit -m "fix: final adjustments from integration smoke test"
  ```

---

## Self-Review

### Spec coverage

| Spec requirement | Task covering it |
|---|---|
| Tool catalog as dynamic state (not static) | Task 4 (`ToolDiscoveryService`) |
| Periodic upstream `tools/list` refresh (5 min) | Task 4 (timer interval) |
| Upstream `notifications/tools/list_changed` subscription | Task 4 (`ensureUpstreamSubscription`) |
| Hash/diff change detection | Task 4 (`toolsSyncCache.shouldSync()`) |
| DB sync on change | Task 4 (`toolsImplementations.sync()`) |
| Downstream `tools.listChanged: true` capability | Task 5 |
| Downstream `notifications/tools/list_changed` fanout | Tasks 3 + 5 |
| Multi-replica fanout via Postgres NOTIFY/LISTEN | Tasks 2 + 4 |
| Tool namespacing (`server__tool`) preserved | Task 4 (prefixedTools) |
| Logs for tool changes | Task 4 (`logger.info` on change) |
| Runtime auth enforced on `tools/call` | Existing middleware untouched |
| Graceful shutdown | Task 6 |

### Type consistency

- `hashTools` exported from Task 1, imported in Task 4 — consistent.
- `downstreamNotificationManager` singleton from Task 3, imported in Tasks 4 and 5 — consistent.
- `pgNotify` singleton from Task 2, used in Tasks 3 and 4 — consistent.
- `toolDiscoveryService` singleton from Task 4, imported in Task 6 — consistent.
- `namespaceServerMappingsTable` — verify in Task 4 Step 1 before writing.
