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
