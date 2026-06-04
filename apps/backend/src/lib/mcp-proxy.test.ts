import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { describe, expect, it } from "vitest";

import mcpProxy, { isExpectedTransportDisconnectError } from "./mcp-proxy";

class FakeTransport implements Transport {
  closeCalls = 0;
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  async start(): Promise<void> {}

  async send(_message: JSONRPCMessage): Promise<void> {}

  async close(): Promise<void> {
    this.closeCalls += 1;
  }
}

describe("isExpectedTransportDisconnectError", () => {
  it("matches SDK Streamable HTTP SSE termination errors", () => {
    expect(
      isExpectedTransportDisconnectError(
        new Error("SSE stream disconnected: TypeError: terminated"),
      ),
    ).toBe(true);
  });

  it("does not match unrelated upstream errors", () => {
    expect(
      isExpectedTransportDisconnectError(
        new Error("Error POSTing to endpoint (HTTP 500)"),
      ),
    ).toBe(false);
  });
});

describe("mcpProxy", () => {
  it("cleans up both transports when the upstream SSE stream terminates", async () => {
    const transportToClient = new FakeTransport();
    const transportToServer = new FakeTransport();
    let cleanupCalls = 0;

    mcpProxy({
      transportToClient,
      transportToServer,
      onCleanup: () => {
        cleanupCalls += 1;
      },
    });

    await transportToServer.onerror?.(
      new Error("SSE stream disconnected: TypeError: terminated"),
    );

    expect(transportToClient.closeCalls).toBe(1);
    expect(transportToServer.closeCalls).toBe(1);
    expect(cleanupCalls).toBe(1);
  });
});
