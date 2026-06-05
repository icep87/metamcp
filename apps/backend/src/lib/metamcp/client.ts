import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioServerParameters } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { ServerParameters } from "@repo/zod-types";

import logger from "@/utils/logger";

import { ProcessManagedStdioTransport } from "../stdio-transport/process-managed-transport";
import { metamcpLogStore } from "./log-store";
import { serverErrorTracker } from "./server-error-tracker";
import { sanitizeHeadersForDebugLog } from "./session-headers-store";
import { resolveEnvVariables } from "./utils";

const sleep = (time: number) =>
  new Promise<void>((resolve) => setTimeout(() => resolve(), time));

export interface ConnectedClient {
  client: Client;
  cleanup: () => Promise<void>;
  onProcessCrash?: (exitCode: number | null, signal: string | null) => void;
  updateForwardedHeaders?: (forwardedHeaders?: Record<string, string>) => void;
}

const getCaseInsensitiveHeaderKey = (
  headers: Record<string, string>,
  headerName: string,
): string | undefined =>
  Object.keys(headers).find(
    (key) => key.toLowerCase() === headerName.toLowerCase(),
  );

const buildHttpHeaders = (
  serverParams: ServerParameters,
  forwardedHeaders?: Record<string, string>,
): {
  authHeaderApplied: boolean;
  forwardedHeaderOutcomes: Record<string, string>;
  headers: Record<string, string>;
} => {
  const configuredHeaders = serverParams.headers || {};

  // Build headers: forwarded first (lowest priority), then DB config, then auth
  const headers: Record<string, string> = {
    ...(forwardedHeaders || {}),
    ...configuredHeaders,
  };

  // Check for authentication - prioritize OAuth tokens, fallback to bearerToken
  const authToken =
    serverParams.oauth_tokens?.access_token || serverParams.bearerToken;
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const authHeaderApplied = Boolean(authToken);
  const forwardedHeaderOutcomes: Record<string, string> = {};

  for (const forwardedHeaderName of Object.keys(forwardedHeaders || {})) {
    const configuredHeaderKey = getCaseInsensitiveHeaderKey(
      configuredHeaders,
      forwardedHeaderName,
    );

    if (configuredHeaderKey) {
      forwardedHeaderOutcomes[forwardedHeaderName] =
        `overridden-by-configured-header:${configuredHeaderKey}`;
    } else if (
      authHeaderApplied &&
      forwardedHeaderName.toLowerCase() === "authorization"
    ) {
      forwardedHeaderOutcomes[forwardedHeaderName] = "overridden-by-auth-token";
    } else {
      forwardedHeaderOutcomes[forwardedHeaderName] = "forwarded";
    }
  }

  return {
    authHeaderApplied,
    forwardedHeaderOutcomes,
    headers,
  };
};

const debugLogHttpHeaders = (
  serverParams: ServerParameters,
  transportType: "SSE" | "STREAMABLE_HTTP",
  forwardedHeaders: Record<string, string> | undefined,
  headers: Record<string, string>,
  authHeaderApplied: boolean,
  forwardedHeaderOutcomes: Record<string, string>,
): void => {
  logger.debug("Prepared upstream MCP request headers", {
    serverName: serverParams.name,
    serverUuid: serverParams.uuid,
    transportType,
    forwardedHeaderNames: Object.keys(forwardedHeaders || {}),
    forwardedHeaders: sanitizeHeadersForDebugLog(forwardedHeaders || {}),
    configuredHeaderNames: Object.keys(serverParams.headers || {}),
    authHeaderApplied,
    forwardedHeaderOutcomes,
    finalHeaders: sanitizeHeadersForDebugLog(headers),
  });
};

/**
 * Transforms localhost URLs to use host.docker.internal when running inside Docker
 */
export const transformDockerUrl = (url: string): string => {
  if (process.env.TRANSFORM_LOCALHOST_TO_DOCKER_INTERNAL === "true") {
    const transformed = url.replace(
      /localhost|127\.0\.0\.1/g,
      "host.docker.internal",
    );
    return transformed;
  }
  return url;
};

export const createMetaMcpClient = (
  serverParams: ServerParameters,
  forwardedHeaders?: Record<string, string>,
): {
  client: Client | undefined;
  transport: Transport | undefined;
  updateForwardedHeaders?: (forwardedHeaders?: Record<string, string>) => void;
} => {
  let transport: Transport | undefined;
  let updateForwardedHeaders:
    | ((forwardedHeaders?: Record<string, string>) => void)
    | undefined;

  // Create the appropriate transport based on server type
  // Default to "STDIO" if type is undefined
  if (!serverParams.type || serverParams.type === "STDIO") {
    // Resolve environment variable placeholders
    const resolvedEnv = serverParams.env
      ? resolveEnvVariables(serverParams.env)
      : undefined;

    const stdioParams: StdioServerParameters = {
      command: serverParams.command || "",
      args: serverParams.args || undefined,
      env: resolvedEnv,
      stderr: "pipe",
    };
    transport = new ProcessManagedStdioTransport(stdioParams);

    // Handle stderr stream when set to "pipe"
    if ((transport as ProcessManagedStdioTransport).stderr) {
      const stderrStream = (transport as ProcessManagedStdioTransport).stderr;

      stderrStream?.on("data", (chunk: Buffer) => {
        metamcpLogStore.addLog(
          serverParams.name,
          "error",
          chunk.toString().trim(),
        );
      });

      stderrStream?.on("error", (error: Error) => {
        metamcpLogStore.addLog(
          serverParams.name,
          "error",
          "stderr error",
          error,
        );
      });
    }
  } else if (serverParams.type === "SSE" && serverParams.url) {
    // Transform the URL if TRANSFORM_LOCALHOST_TO_DOCKER_INTERNAL is set to "true"
    const transformedUrl = transformDockerUrl(serverParams.url);
    const headers: Record<string, string> = {};
    updateForwardedHeaders = (nextForwardedHeaders) => {
      const {
        authHeaderApplied,
        forwardedHeaderOutcomes,
        headers: nextHeaders,
      } = buildHttpHeaders(serverParams, nextForwardedHeaders);

      for (const key of Object.keys(headers)) {
        delete headers[key];
      }
      Object.assign(headers, nextHeaders);

      debugLogHttpHeaders(
        serverParams,
        "SSE",
        nextForwardedHeaders,
        headers,
        authHeaderApplied,
        forwardedHeaderOutcomes,
      );
    };
    updateForwardedHeaders(forwardedHeaders);

    transport = new SSEClientTransport(new URL(transformedUrl), {
      requestInit: {
        headers,
      },
      eventSourceInit: {
        fetch: (url, init) => fetch(url, { ...init, headers }),
      },
    });
  } else if (serverParams.type === "STREAMABLE_HTTP" && serverParams.url) {
    // Transform the URL if TRANSFORM_LOCALHOST_TO_DOCKER_INTERNAL is set to "true"
    const transformedUrl = transformDockerUrl(serverParams.url);
    const headers: Record<string, string> = {};
    updateForwardedHeaders = (nextForwardedHeaders) => {
      const {
        authHeaderApplied,
        forwardedHeaderOutcomes,
        headers: nextHeaders,
      } = buildHttpHeaders(serverParams, nextForwardedHeaders);

      for (const key of Object.keys(headers)) {
        delete headers[key];
      }
      Object.assign(headers, nextHeaders);

      debugLogHttpHeaders(
        serverParams,
        "STREAMABLE_HTTP",
        nextForwardedHeaders,
        headers,
        authHeaderApplied,
        forwardedHeaderOutcomes,
      );
    };
    updateForwardedHeaders(forwardedHeaders);

    transport = new StreamableHTTPClientTransport(new URL(transformedUrl), {
      requestInit: {
        headers,
      },
    });
  } else {
    metamcpLogStore.addLog(
      serverParams.name,
      "error",
      `Unsupported server type: ${serverParams.type}`,
    );
    return { client: undefined, transport: undefined };
  }

  const client = new Client(
    {
      name: "metamcp-client",
      version: "2.0.0",
    },
    {
      capabilities: {
        prompts: {},
        resources: { subscribe: true },
        tools: {},
      },
    },
  );
  return { client, transport, updateForwardedHeaders };
};

export const connectMetaMcpClient = async (
  serverParams: ServerParameters,
  onProcessCrash?: (exitCode: number | null, signal: string | null) => void,
  forwardedHeaders?: Record<string, string>,
): Promise<ConnectedClient | undefined> => {
  const waitFor = 5000;

  // Get max attempts from server error tracker instead of hardcoding
  const maxAttempts = await serverErrorTracker.getServerMaxAttempts(
    serverParams.uuid,
  );
  let count = 0;
  let retry = true;

  logger.info(
    `Connecting to server ${serverParams.name} (${serverParams.uuid}) with max attempts: ${maxAttempts}`,
  );

  while (retry) {
    let transport: Transport | undefined;
    let client: Client | undefined;

    try {
      // Check if server is already in error state before attempting connection
      const isInErrorState = await serverErrorTracker.isServerInErrorState(
        serverParams.uuid,
      );
      if (isInErrorState) {
        logger.info(
          `Server ${serverParams.name} (${serverParams.uuid}) is already in ERROR state, skipping connection attempt`,
        );
        return undefined;
      }

      // Create fresh client and transport for each attempt
      const result = createMetaMcpClient(serverParams, forwardedHeaders);
      client = result.client;
      transport = result.transport;
      const updateForwardedHeaders = result.updateForwardedHeaders;

      if (!client || !transport) {
        return undefined;
      }

      const connectedClient = client;
      const connectedTransport = transport;

      // Set up process crash detection for STDIO transports BEFORE connecting
      if (connectedTransport instanceof ProcessManagedStdioTransport) {
        logger.info(
          `Setting up crash handler for server ${serverParams.name} (${serverParams.uuid})`,
        );
        connectedTransport.onprocesscrash = (exitCode, signal) => {
          logger.info(
            `Process crashed for server ${serverParams.name} (${serverParams.uuid}): code=${exitCode}, signal=${signal}`,
          );

          // Notify the pool about the crash
          if (onProcessCrash) {
            logger.info(
              `Calling onProcessCrash callback for server ${serverParams.name} (${serverParams.uuid})`,
            );
            onProcessCrash(exitCode, signal);
          } else {
            logger.info(
              `No onProcessCrash callback provided for server ${serverParams.name} (${serverParams.uuid})`,
            );
          }
        };
      }

      await connectedClient.connect(connectedTransport);

      return {
        client: connectedClient,
        cleanup: async () => {
          await connectedTransport.close();
          await connectedClient.close();
        },
        onProcessCrash: (exitCode, signal) => {
          logger.warn(
            `Process crash detected for server ${serverParams.name} (${serverParams.uuid}): code=${exitCode}, signal=${signal}`,
          );

          // Notify the pool about the crash
          if (onProcessCrash) {
            onProcessCrash(exitCode, signal);
          }
        },
        updateForwardedHeaders,
      };
    } catch (error) {
      metamcpLogStore.addLog(
        "client",
        "error",
        `Error connecting to MetaMCP client (attempt ${count + 1}/${maxAttempts})`,
        error,
      );

      // CRITICAL FIX: Clean up transport/process on connection failure
      // This prevents orphaned processes from accumulating
      if (transport) {
        try {
          await transport.close();
          console.log(
            `Cleaned up transport for failed connection to ${serverParams.name} (${serverParams.uuid})`,
          );
        } catch (cleanupError) {
          console.error(
            `Error cleaning up transport for ${serverParams.name} (${serverParams.uuid}):`,
            cleanupError,
          );
        }
      }
      if (client) {
        try {
          await client.close();
        } catch (_cleanupError) {
          // Client may not be fully initialized, ignore
        }
      }

      count++;
      retry = count < maxAttempts;
      if (retry) {
        await sleep(waitFor);
      }
    }
  }

  return undefined;
};
