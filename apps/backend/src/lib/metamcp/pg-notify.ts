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
   * No-ops gracefully (logs error) if the pool connection fails.
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
