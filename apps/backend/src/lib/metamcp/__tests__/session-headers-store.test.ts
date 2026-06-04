import { beforeEach, describe, expect, it } from "vitest";

import {
  sanitizeHeadersForDebugLog,
  sessionHeadersStore,
} from "../session-headers-store";

describe("sessionHeadersStore", () => {
  beforeEach(() => {
    sessionHeadersStore.delete("test-session");
  });

  it("stores and retrieves headers by sessionId", () => {
    sessionHeadersStore.set("test-session", { "x-user-id": "alice" });
    expect(sessionHeadersStore.get("test-session")).toEqual({
      "x-user-id": "alice",
    });
  });

  it("returns undefined for unknown sessionId", () => {
    expect(sessionHeadersStore.get("unknown")).toBeUndefined();
  });

  it("deletes headers by sessionId", () => {
    sessionHeadersStore.set("test-session", { "x-user-id": "alice" });
    sessionHeadersStore.delete("test-session");
    expect(sessionHeadersStore.get("test-session")).toBeUndefined();
  });
});

describe("sessionHeadersStore.filterHeaders", () => {
  it("returns only headers in the allowlist", () => {
    const result = sessionHeadersStore.filterHeaders(
      { "x-user-id": "alice", "x-other": "val", authorization: "Bearer tok" },
      ["x-user-id"],
    );
    expect(result).toEqual({ "x-user-id": "alice" });
  });

  it("is case-insensitive for allowlist matching", () => {
    const result = sessionHeadersStore.filterHeaders({ "X-User-Id": "alice" }, [
      "x-user-id",
    ]);
    expect(result).toEqual({ "x-user-id": "alice" });
  });

  it("returns empty object for empty allowlist", () => {
    const result = sessionHeadersStore.filterHeaders(
      { "x-user-id": "alice" },
      [],
    );
    expect(result).toEqual({});
  });

  it("ignores headers not present in request", () => {
    const result = sessionHeadersStore.filterHeaders({ "x-other": "val" }, [
      "x-user-id",
    ]);
    expect(result).toEqual({});
  });

  it("takes first value when header is an array", () => {
    const result = sessionHeadersStore.filterHeaders(
      { "x-user-id": ["alice", "bob"] },
      ["x-user-id"],
    );
    expect(result).toEqual({ "x-user-id": "alice" });
  });
});

describe("sanitizeHeadersForDebugLog", () => {
  it("redacts sensitive header values but keeps non-sensitive forwarded values", () => {
    const result = sanitizeHeadersForDebugLog({
      authorization: "Bearer token",
      "x-api-key": "secret-key",
      "x-user-id": "alice",
    });

    expect(result).toEqual({
      authorization: "Bearer [redacted]",
      "x-api-key": "[redacted]",
      "x-user-id": "alice",
    });
  });

  it("redacts authorization token values case-insensitively", () => {
    expect(
      sanitizeHeadersForDebugLog({
        Authorization: "Basic dXNlcjpwYXNz",
      }),
    ).toEqual({
      Authorization: "Basic [redacted]",
    });
  });

  it("fully redacts malformed authorization values", () => {
    expect(
      sanitizeHeadersForDebugLog({
        authorization: "",
      }),
    ).toEqual({
      authorization: "[redacted]",
    });
  });
});
