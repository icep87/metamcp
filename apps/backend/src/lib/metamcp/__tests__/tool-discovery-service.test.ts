import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock all heavy dependencies before importing the service
vi.mock("@/db", () => ({ db: { select: vi.fn() } }));
vi.mock("@/db/schema", () => ({
  namespaceServerMappingsTable: {
    namespace_uuid: "namespace_uuid",
    mcp_server_uuid: "mcp_server_uuid",
  },
}));
vi.mock("@/db/repositories/namespace-mappings.repo", () => ({
  namespaceMappingsRepository: {
    syncToolMappingsForServer: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock("@/db/repositories/tools.repo", () => ({
  toolsRepository: {
    findByMcpServerUuid: vi
      .fn()
      .mockResolvedValue([{ uuid: "tool-uuid-1", name: "myserver__tool1" }]),
  },
}));
vi.mock("../../../trpc/tools.impl", () => ({
  toolsImplementations: {
    sync: vi.fn().mockResolvedValue({
      success: true,
      count: 1,
      message: "Synced 1 tools",
    }),
  },
}));
vi.mock("../mcp-server-pool", () => ({
  mcpServerPool: {
    serverParamsCache: {},
    getSession: vi.fn(),
    getServerUuids: vi.fn(() => []),
    getServerParams: vi.fn(() => undefined),
    excludeSessionFromExpiry: vi.fn(),
  },
}));
vi.mock("../downstream-notification-manager", () => ({
  downstreamNotificationManager: { notifyNamespace: vi.fn() },
}));
vi.mock("../pg-notify", () => ({
  pgNotify: {
    start: vi.fn(),
    stop: vi.fn(),
    subscribe: vi.fn(),
    notify: vi.fn(),
  },
}));
vi.mock("../utils", () => ({ sanitizeName: (s: string) => s }));

import { namespaceMappingsRepository } from "@/db/repositories/namespace-mappings.repo";

import { toolsImplementations } from "../../../trpc/tools.impl";
import { mcpServerPool } from "../mcp-server-pool";
import { pgNotify } from "../pg-notify";
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
    await expect(
      (svc as any).refreshServer("nonexistent-uuid"),
    ).resolves.not.toThrow();
  });

  it("getNamespacesForServer is a callable method", () => {
    const svc = new ToolDiscoveryService();
    expect(typeof (svc as any).getNamespacesForServer).toBe("function");
  });
});

describe("_refreshServer tool mapping sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    toolsSyncCache.clear();
  });

  it("calls toolsImplementations.sync exactly once and syncs namespace_tool_mappings per namespace", async () => {
    (mcpServerPool.getServerParams as any).mockReturnValue({
      name: "myserver",
    });
    const fakeClient = {
      listTools: vi
        .fn()
        .mockResolvedValue({ tools: [{ name: "tool1", inputSchema: {} }] }),
      getServerCapabilities: vi.fn().mockReturnValue({}),
    };
    (mcpServerPool.getSession as any).mockResolvedValue({ client: fakeClient });

    const svc = new ToolDiscoveryService();
    vi.spyOn(svc as any, "getNamespacesForServer").mockResolvedValue([
      "ns-a",
      "ns-b",
    ]);
    vi.spyOn(svc as any, "ensureUpstreamSubscription").mockResolvedValue(
      undefined,
    );

    await (svc as any)._refreshServer("srv-uuid");

    // sync() must be called exactly once (not once per namespace)
    expect(toolsImplementations.sync).toHaveBeenCalledTimes(1);
    // pgNotify must be called once per namespace
    expect(pgNotify.notify).toHaveBeenCalledTimes(2);
    // syncToolMappingsForServer must be called once per namespace
    expect(
      namespaceMappingsRepository.syncToolMappingsForServer,
    ).toHaveBeenCalledTimes(2);
    expect(
      namespaceMappingsRepository.syncToolMappingsForServer,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        namespaceUuid: "ns-a",
        serverUuid: "srv-uuid",
      }),
    );
  });

  it("calls sync() even when server has no namespace mappings (zero-namespace case)", async () => {
    (mcpServerPool.getServerParams as any).mockReturnValue({
      name: "myserver",
    });
    const fakeClient = {
      listTools: vi
        .fn()
        .mockResolvedValue({ tools: [{ name: "tool1", inputSchema: {} }] }),
      getServerCapabilities: vi.fn().mockReturnValue({}),
    };
    (mcpServerPool.getSession as any).mockResolvedValue({ client: fakeClient });

    const svc = new ToolDiscoveryService();
    vi.spyOn(svc as any, "getNamespacesForServer").mockResolvedValue([]); // no namespaces
    vi.spyOn(svc as any, "ensureUpstreamSubscription").mockResolvedValue(
      undefined,
    );

    await (svc as any)._refreshServer("srv-uuid");

    // sync() still runs even with no namespaces (to clean up stale tools)
    expect(toolsImplementations.sync).toHaveBeenCalledTimes(1);
    // No namespace sync or notify needed
    expect(
      namespaceMappingsRepository.syncToolMappingsForServer,
    ).not.toHaveBeenCalled();
  });
});
