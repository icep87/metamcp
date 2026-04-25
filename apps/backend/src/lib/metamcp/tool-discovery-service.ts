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

const TOOL_DISCOVERY_INTERVAL_MS = parseInt(
  process.env.TOOL_DISCOVERY_INTERVAL_MS ?? "300000",
  10,
); // 5 min default

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

    // Start Postgres LISTEN. Each replica receives NOTIFY and fans out to local downstream sessions.
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
        const result = await client.listTools(
          cursor !== undefined ? { cursor } : undefined,
        );
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

        await toolsImplementations.sync({
          mcpServerUuid: serverUuid,
          tools: prefixedTools,
        });

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
      .where(eq(namespaceServerMappingsTable.mcp_server_uuid, serverUuid));
    return rows.map((r) => r.namespaceUuid);
  }
}

export const toolDiscoveryService = new ToolDiscoveryService();
