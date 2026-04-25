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
