import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";

import express from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/db/repositories/api-keys.repo", () => ({
  ApiKeysRepository: class {},
}));
vi.mock("@/utils/logger", () => ({
  default: { error: vi.fn() },
}));

import {
  ApiKeyAuthenticatedRequest,
  authenticateApiKey,
} from "@/middleware/api-key-oauth.middleware";

import metadataRouter from "./metadata";

const origin = "https://metamcp.ebike.dev";
const metadataPath = "/.well-known/oauth-protected-resource";

// Exercise Express routing without a listening socket or database.
function request(app: express.Express, url: string, method = "GET") {
  return new Promise<{
    status: number;
    headers: ReturnType<ServerResponse["getHeaders"]>;
    body: Record<string, unknown>;
  }>((resolve) => {
    const req = new IncomingMessage(new Socket());
    req.url = url;
    req.method = method;
    req.headers.host = "internal-backend:12009";
    const res = new ServerResponse(req);
    res.end = ((body?: string | Uint8Array) => {
      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        body: body ? JSON.parse(body.toString()) : {},
      });
      return res;
    }) as typeof res.end;
    app(req, res);
  });
}

function createApp(enableOAuth = true, enableApiKey = false) {
  const app = express();
  app.use(metadataRouter);
  const endpointRouter = express.Router();
  endpointRouter.use((req, _res, next) => {
    (req as ApiKeyAuthenticatedRequest).endpoint = {
      enable_oauth: enableOAuth,
      enable_api_key_auth: enableApiKey,
    } as ApiKeyAuthenticatedRequest["endpoint"];
    next();
  });
  endpointRouter.use(authenticateApiKey);
  endpointRouter.use((_req, res) => res.status(204).end());
  app.use("/metamcp", endpointRouter);
  app.use((_req, res) => res.status(404).end());
  return app;
}

describe("OAuth protected resource discovery", () => {
  beforeEach(() => vi.stubEnv("APP_URL", origin));
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    "/metamcp/ask-ebike/mcp",
    "/metamcp/another-endpoint/mcp",
    "/metamcp/ask-ebike/sse",
    "/metamcp/ask-ebike/message?sessionId=private-session",
    "/metamcp/ask-ebike/api",
    "/metamcp/ask-ebike/api/tools/example",
    "/metamcp/ask-ebike/mcp/",
    "/metamcp/ask%20ebike/mcp",
  ])("follows the mounted endpoint challenge for %s", async (url) => {
    const app = createApp();
    const path = url.split("?")[0];
    const expectedMetadataUrl = `${origin}${metadataPath}${path}`;
    const challenge = await request(app, url, "POST");
    expect(challenge.status).toBe(401);
    expect(challenge.headers["www-authenticate"]).toContain(
      `resource_metadata="${expectedMetadataUrl}"`,
    );
    expect(challenge.body.resource_metadata).toBe(expectedMetadataUrl);
    const metadata = await request(app, new URL(expectedMetadataUrl).pathname);
    expect(metadata.status).toBe(200);
    expect(metadata.headers["content-type"]).toContain("application/json");
    expect(metadata.body.resource).toBe(`${origin}${path}`);
    expect(metadata.body.authorization_servers).toEqual([origin]);
  });

  it("supports discovery directly without a prior challenge", async () => {
    const metadata = await request(
      createApp(),
      `${metadataPath}/metamcp/ask-ebike/mcp`,
    );
    expect(metadata.status).toBe(200);
    expect(metadata.body.resource).toBe(`${origin}/metamcp/ask-ebike/mcp`);
  });

  it("normalizes APP_URL trailing slashes in both challenge and metadata", async () => {
    vi.stubEnv("APP_URL", `${origin}///`);
    const app = createApp();
    const path = "/metamcp/ask-ebike/mcp";
    const challenge = await request(app, path);
    expect(challenge.body.resource_metadata).toBe(
      `${origin}${metadataPath}${path}`,
    );
    const metadata = await request(app, `${metadataPath}${path}`);
    expect(metadata.body.resource).toBe(`${origin}${path}`);
    expect(metadata.body.authorization_servers).toEqual([origin]);
  });

  it("keeps root discovery available without adding a slash to its resource", async () => {
    const metadata = await request(createApp(), metadataPath);
    expect(metadata.status).toBe(200);
    expect(metadata.body.resource).toBe(origin);
  });

  it("keeps the authorization server issuer equal to the advertised issuer", async () => {
    const app = createApp();
    const metadata = await request(app, metadataPath);
    const authorization = await request(
      app,
      "/.well-known/oauth-authorization-server",
    );
    expect(authorization.body.issuer).toBe(origin);
    expect(metadata.body.authorization_servers).toEqual([
      authorization.body.issuer,
    ]);
  });

  it("does not publish metadata for unrelated paths", async () => {
    expect(
      (await request(createApp(), `${metadataPath}/unrelated`)).status,
    ).toBe(404);
  });

  it("advertises endpoint metadata when both OAuth and API keys are enabled", async () => {
    const challenge = await request(
      createApp(true, true),
      "/metamcp/ask-ebike/mcp",
    );
    expect(challenge.status).toBe(401);
    expect(challenge.body.resource_metadata).toBe(
      `${origin}${metadataPath}/metamcp/ask-ebike/mcp`,
    );
  });

  it("keeps API-key-only endpoints free of OAuth challenges", async () => {
    const challenge = await request(
      createApp(false, true),
      "/metamcp/ask-ebike/mcp",
    );
    expect(challenge.status).toBe(401);
    expect(challenge.headers["www-authenticate"]).toBeUndefined();
    expect(challenge.body.resource_metadata).toBeUndefined();
  });

  it("allows unauthenticated endpoints through", async () => {
    expect(
      (await request(createApp(false, false), "/metamcp/ask-ebike/mcp")).status,
    ).toBe(204);
  });
});
