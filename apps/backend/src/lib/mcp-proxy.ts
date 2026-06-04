import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { isJSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";

import logger from "@/utils/logger";

export function isExpectedTransportDisconnectError(error: Error): boolean {
  const message = error.message || "";

  return (
    message.includes("Not connected") ||
    message.includes("SSE stream disconnected") ||
    message.includes("TypeError: terminated") ||
    message.includes("The operation was aborted") ||
    message.includes("AbortError")
  );
}

function onClientError(error: Error) {
  // Don't log disconnect errors as server errors; they are expected when a
  // client closes an SSE/Streamable HTTP session.
  if (isExpectedTransportDisconnectError(error)) {
    logger.debug("Client transport disconnected (expected during cleanup)");
    return;
  }
  logger.error("Error from inspector client:", error);
}

function onServerError(error: Error) {
  // Don't log disconnect errors as server errors; the SDK reports closed
  // Streamable HTTP response streams as "SSE stream disconnected: ...".
  if (isExpectedTransportDisconnectError(error)) {
    logger.debug("Server transport disconnected (expected during cleanup)");
    return;
  }

  if (
    (error?.message &&
      error.message.includes("Error POSTing to endpoint (HTTP 404)")) ||
    (error?.cause && JSON.stringify(error.cause).includes("ECONNREFUSED"))
  ) {
    logger.error("Connection refused. Is the MCP server running?");
  } else {
    logger.error("Error from MCP server:", error);
  }
}

export default function mcpProxy({
  transportToClient,
  transportToServer,
  onCleanup,
}: {
  transportToClient: Transport;
  transportToServer: Transport;
  onCleanup?: () => Promise<void> | void;
}) {
  let transportToClientClosed = false;
  let transportToServerClosed = false;
  let cleanupCalled = false;

  let reportedServerSession = false;

  // Helper function to safely trigger cleanup once
  const triggerCleanup = async () => {
    if (cleanupCalled) {
      logger.debug("Cleanup already called, skipping");
      return;
    }
    if (!onCleanup) {
      logger.debug("No cleanup callback provided, skipping");
      return;
    }
    cleanupCalled = true;

    try {
      logger.debug(
        "Triggering MCP proxy cleanup (server session/subprocess cleanup)",
      );
      await onCleanup();
      logger.debug("MCP proxy cleanup completed successfully");
    } catch (error) {
      logger.error("Error during MCP proxy cleanup:", error);
    }
  };

  // Helper function to close both transports safely
  const closeAllTransports = async () => {
    const promises = [];

    if (!transportToClientClosed) {
      transportToClientClosed = true;
      promises.push(transportToClient.close().catch(onClientError));
    }

    if (!transportToServerClosed) {
      transportToServerClosed = true;
      promises.push(transportToServer.close().catch(onServerError));
    }

    await Promise.allSettled(promises);
    await triggerCleanup();
  };

  transportToClient.onmessage = (message) => {
    // Check if server transport is still connected before sending
    if (transportToServerClosed) {
      logger.debug("Ignoring message to closed server transport");
      return;
    }

    transportToServer.send(message).catch(async (error) => {
      // Handle connection closed errors gracefully
      if (isExpectedTransportDisconnectError(error)) {
        logger.debug(
          "Server transport disconnected while sending message, cleaning up",
        );
        await closeAllTransports();
        return;
      }

      // Send error response back to client if it was a request (has id) and connection is still open
      if (isJSONRPCRequest(message) && !transportToClientClosed) {
        const errorResponse = {
          jsonrpc: "2.0" as const,
          id: message.id,
          error: {
            code: -32001,
            message: error.message,
            data: error,
          },
        };

        // Safely send error response
        if (!transportToClientClosed) {
          transportToClient.send(errorResponse).catch(onClientError);
        }
      }
    });
  };

  transportToServer.onmessage = (message) => {
    if (!reportedServerSession) {
      if (transportToServer.sessionId) {
        // Can only report for StreamableHttp
        logger.info(
          "Proxy  <-> Server sessionId: " + transportToServer.sessionId,
        );
      }
      reportedServerSession = true;
    }

    // Check if client transport is still connected before sending
    if (transportToClientClosed) {
      logger.debug("Ignoring message to closed client transport");
      return;
    }

    transportToClient.send(message).catch(async (error) => {
      // Handle connection closed errors gracefully
      if (isExpectedTransportDisconnectError(error)) {
        logger.debug(
          "Client transport disconnected while sending message, cleaning up",
        );
        await closeAllTransports();
        return;
      }
      onClientError(error);
    });
  };

  transportToClient.onclose = async () => {
    logger.debug("Client transport closed");
    if (!transportToClientClosed) {
      transportToClientClosed = true;
      if (!transportToServerClosed) {
        logger.debug("Closing server transport due to client close");
        await transportToServer.close().catch(onServerError);
      }
    }
    await triggerCleanup();
  };

  transportToServer.onclose = async () => {
    logger.debug("Server transport closed");
    if (!transportToServerClosed) {
      transportToServerClosed = true;
      if (!transportToClientClosed) {
        logger.debug("Closing client transport due to server close");
        await transportToClient.close().catch(onClientError);
      }
    }
    await triggerCleanup();
  };

  transportToClient.onerror = async (error) => {
    // Mark as closed and trigger cleanup if we get a connection error
    if (isExpectedTransportDisconnectError(error)) {
      logger.debug("Client transport disconnected, cleaning up");
      await closeAllTransports();
      return;
    }
    onClientError(error);
  };

  transportToServer.onerror = async (error) => {
    // Mark as closed and trigger cleanup if we get a connection error
    if (isExpectedTransportDisconnectError(error)) {
      logger.debug("Server transport disconnected, cleaning up");
      await closeAllTransports();
      return;
    }
    onServerError(error);
  };
}
