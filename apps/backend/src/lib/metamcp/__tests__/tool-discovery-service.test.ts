import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock all heavy dependencies before importing the service
vi.mock("@/db", () => ({ db: { select: vi.fn() } }));
vi.mock("@/db/schema", () => ({
  namespaceServerMappingsTable: {
    namespace_uuid: "namespace_uuid",
    mcp_server_uuid: "mcp_server_uuid",
  },
}));
vi.mock("../../trpc/tools.impl", () => ({
  toolsImplementations: { sync: vi.fn() },
}));
vi.mock("../mcp-server-pool", () => ({
  mcpServerPool: { serverParamsCache: {}, getSession: vi.fn() },
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
