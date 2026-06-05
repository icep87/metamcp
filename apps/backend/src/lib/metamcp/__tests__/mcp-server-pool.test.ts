import { ServerParameters } from "@repo/zod-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/logger", () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../../config.service", () => ({
  configService: {
    getSessionLifetime: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("../server-error-tracker", () => ({
  serverErrorTracker: {
    isServerInErrorState: vi.fn().mockResolvedValue(false),
    recordServerCrash: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../client", () => ({
  connectMetaMcpClient: vi.fn(),
}));

import { ConnectedClient, connectMetaMcpClient } from "../client";
import { McpServerPool } from "../mcp-server-pool";

const createPool = (): McpServerPool =>
  new (McpServerPool as unknown as {
    new (
      defaultIdleCount?: number,
      maxTotalConnections?: number,
    ): McpServerPool;
  })(1, 100);

const params = {
  name: "server",
  type: "STREAMABLE_HTTP",
  url: "http://example.com/mcp",
  uuid: "server-1",
} as ServerParameters;

const createConnectedClient = (): ConnectedClient => ({
  cleanup: vi.fn().mockResolvedValue(undefined),
  client: {} as ConnectedClient["client"],
  updateForwardedHeaders: vi.fn(),
});

describe("McpServerPool forwarded headers", () => {
  let pool: McpServerPool;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(connectMetaMcpClient).mockImplementation(async () =>
      createConnectedClient(),
    );
    pool = createPool();
  });

  afterEach(async () => {
    await pool.cleanupAll();
  });

  it("updates forwarded headers when converting an idle client to active", async () => {
    const idleClient = createConnectedClient();
    vi.mocked(connectMetaMcpClient).mockResolvedValueOnce(idleClient);
    await pool.ensureIdleSessionForNewServer("server-1", params, "namespace-1");

    const forwardedHeaders = { "x-cost-center": "team-a" };
    const session = await pool.getSession(
      "session-1",
      "server-1",
      params,
      "namespace-1",
      forwardedHeaders,
    );

    expect(session).toBe(idleClient);
    expect(idleClient.updateForwardedHeaders).toHaveBeenCalledWith(
      forwardedHeaders,
    );
  });

  it("updates forwarded headers on an already active client for each request", async () => {
    const firstHeaders = { "x-cost-center": "team-a" };
    const secondHeaders = { "x-cost-center": "team-b" };

    const session = await pool.getSession(
      "session-1",
      "server-1",
      params,
      "namespace-1",
      firstHeaders,
    );

    const sameSession = await pool.getSession(
      "session-1",
      "server-1",
      params,
      "namespace-1",
      secondHeaders,
    );

    expect(sameSession).toBe(session);
    expect(session?.updateForwardedHeaders).toHaveBeenCalledWith(secondHeaders);
  });
});
