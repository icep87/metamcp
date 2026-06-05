import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/logger", () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../../config.service", () => ({
  configService: {},
}));

vi.mock("../mcp-server-pool", () => ({
  mcpServerPool: {
    cleanupAll: vi.fn().mockResolvedValue(undefined),
    cleanupSession: vi.fn().mockResolvedValue(undefined),
    getPoolStatus: vi.fn(() => ({
      active: 0,
      activeSessionIds: [],
      idle: 0,
      idleServerUuids: [],
    })),
  },
}));

vi.mock("../metamcp-proxy", () => ({
  createServer: vi.fn(),
}));

import { createServer } from "../metamcp-proxy";
import { MetaMcpServerPool } from "../metamcp-server-pool";

type CreatedServer = Awaited<ReturnType<typeof createServer>>;

const createPool = (): MetaMcpServerPool =>
  new (MetaMcpServerPool as unknown as {
    new (defaultIdleCount?: number): MetaMcpServerPool;
  })(1);

describe("MetaMcpServerPool", () => {
  let createdServers: Array<{
    serverState: {
      forwardedHeaders?: Record<string, string>;
      sessionId: string;
    };
    setSessionContext: ReturnType<typeof vi.fn>;
  }>;
  let pool: MetaMcpServerPool;

  beforeEach(() => {
    vi.clearAllMocks();
    createdServers = [];
    vi.mocked(createServer).mockImplementation(
      async (
        _namespaceUuid,
        sessionId,
        _includeInactiveServers,
        forwardedHeaders,
      ) => {
        const serverState = {
          forwardedHeaders,
          sessionId,
        };
        const setSessionContext = vi.fn(
          (context: {
            forwardedHeaders?: Record<string, string>;
            sessionId: string;
          }) => {
            serverState.forwardedHeaders = context.forwardedHeaders;
            serverState.sessionId = context.sessionId;
          },
        );

        createdServers.push({ serverState, setSessionContext });

        return {
          cleanup: vi.fn().mockResolvedValue(undefined),
          server: serverState as unknown as CreatedServer["server"],
          setSessionContext,
        };
      },
    );
    pool = createPool();
  });

  afterEach(async () => {
    await pool.cleanupAll();
  });

  it("reuses an idle server and binds forwarded headers when activating it", async () => {
    await pool.ensureIdleServers(["namespace-1"]);
    expect(pool.getPoolStatus()).toMatchObject({
      active: 0,
      idle: 1,
      idleNamespaceUuids: ["namespace-1"],
    });
    const idleServerState = createdServers[0]?.serverState;
    const idleSetSessionContext = createdServers[0]?.setSessionContext;

    const forwardedHeaders = { "x-user-id": "alice" };
    const server = await pool.getServer(
      "session-1",
      "namespace-1",
      forwardedHeaders,
    );

    expect(server?.server).toBe(idleServerState);
    expect(idleSetSessionContext).toHaveBeenCalledWith({
      forwardedHeaders,
      sessionId: "session-1",
    });
    expect(
      vi
        .mocked(createServer)
        .mock.calls.some(
          ([namespaceUuid, createdSessionId]) =>
            namespaceUuid === "namespace-1" && createdSessionId === "session-1",
        ),
    ).toBe(false);
    expect(server?.server).toEqual({
      forwardedHeaders,
      sessionId: "session-1",
    });
    expect(pool.getPoolStatus()).toMatchObject({
      active: 1,
      activeSessionIds: ["session-1"],
    });
  });

  it("creates a new active server with forwarded headers when no idle server exists", async () => {
    const forwardedHeaders = { "x-user-id": "alice" };
    const server = await pool.getServer(
      "session-1",
      "namespace-1",
      forwardedHeaders,
    );

    expect(createServer).toHaveBeenCalledWith(
      "namespace-1",
      "session-1",
      false,
      forwardedHeaders,
    );
    expect(server?.server).toEqual({
      forwardedHeaders,
      sessionId: "session-1",
    });
    expect(pool.getPoolStatus()).toMatchObject({
      active: 1,
      activeSessionIds: ["session-1"],
    });
  });
});
