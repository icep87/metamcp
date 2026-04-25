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
