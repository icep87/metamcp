import { PgNotify } from "../pg-notify";

describe("PgNotify", () => {
  it("can be instantiated", () => {
    const pg = new PgNotify("postgresql://localhost/test");
    expect(pg).toBeDefined();
    pg.stop(); // must not throw
  });

  it("notify() does not throw when pool is not started", async () => {
    const pg = new PgNotify("postgresql://localhost/test");
    // We don't start it — notify should fail gracefully (log error, not throw)
    await expect(pg.notify("metamcp_tools_changed", { namespaceUuid: "abc" })).resolves.not.toThrow();
    pg.stop();
  });
});
