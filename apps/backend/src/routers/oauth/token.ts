import express from "express";

import logger from "@/utils/logger";

import { oauthRepository } from "../../db/repositories";
import {
  generateSecureAccessToken,
  generateSecureRefreshToken,
  rateLimitToken,
} from "./utils";

const tokenRouter = express.Router();

const ACCESS_TOKEN_EXPIRY = 3600; // 1 hour in seconds
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 3600; // 7 days in seconds

/**
 * Issue a new access + refresh token pair and persist them.
 */
async function issueTokenPair(
  clientId: string,
  userId: string,
  scope: string,
): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const accessToken = generateSecureAccessToken();
  const refreshToken = generateSecureRefreshToken();
  const now = Date.now();

  await oauthRepository.setAccessToken(accessToken, {
    client_id: clientId,
    user_id: userId,
    scope,
    expires_at: now + ACCESS_TOKEN_EXPIRY * 1000,
    refresh_token: refreshToken,
    refresh_token_expires_at: now + REFRESH_TOKEN_EXPIRY * 1000,
  });

  return { access_token: accessToken, refresh_token: refreshToken, expires_in: ACCESS_TOKEN_EXPIRY };
}

/**
 * OAuth 2.0 Token Endpoint
 * Handles token exchange requests from MCP clients
 * Implements proper PKCE verification and code validation
 */
tokenRouter.post("/oauth/token", rateLimitToken, async (req, res) => {
  try {
    // Check if body was parsed correctly
    if (!req.body || typeof req.body !== "object") {
      logger.error("Token endpoint: req.body is undefined or invalid", {
        body: req.body,
        bodyType: typeof req.body,
        contentType: req.headers["content-type"],
        method: req.method,
      });
      return res.status(400).json({
        error: "invalid_request",
        error_description:
          "Request body is missing or malformed. Ensure Content-Type is application/json or application/x-www-form-urlencoded",
      });
    }

    const { grant_type } = req.body;

    if (grant_type === "refresh_token") {
      return handleRefreshTokenGrant(req, res);
    }

    if (grant_type !== "authorization_code") {
      return res.status(400).json({
        error: "unsupported_grant_type",
        error_description:
          "Only 'authorization_code' and 'refresh_token' grant types are supported",
      });
    }

    return handleAuthorizationCodeGrant(req, res);
  } catch (error) {
    logger.error("Error in OAuth token endpoint:", error);
    res.status(500).json({
      error: "server_error",
      error_description: "Internal server error",
    });
  }
});

async function handleAuthorizationCodeGrant(
  req: express.Request,
  res: express.Response,
) {
  const { code, redirect_uri, client_id, code_verifier } = req.body;

  // Validate authorization code
  if (!code) {
    return res.status(400).json({
      error: "invalid_request",
      error_description: "Missing authorization code",
    });
  }

  // Look up the authorization code
  const codeData = await oauthRepository.getAuthCode(code);
  if (!codeData) {
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Invalid or expired authorization code",
    });
  }

  // Check if code has expired (10 minutes)
  if (Date.now() > codeData.expires_at.getTime()) {
    await oauthRepository.deleteAuthCode(code);
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Authorization code has expired",
    });
  }

  // Validate client_id and redirect_uri match the original request
  if (codeData.client_id !== client_id) {
    return res.status(400).json({
      error: "invalid_client",
      error_description: "Client ID does not match",
    });
  }

  if (codeData.redirect_uri !== redirect_uri) {
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Redirect URI does not match",
    });
  }

  // Validate client_id against registered clients
  const clientData = await oauthRepository.getClient(client_id);
  if (!clientData) {
    return res.status(400).json({
      error: "invalid_client",
      error_description: "Client not found or not registered",
    });
  }

  // Validate client authentication based on registered auth method
  if (clientData.token_endpoint_auth_method === "client_secret_basic") {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return res.status(401).json({
        error: "invalid_client",
        error_description: "Client authentication required via Basic auth",
      });
    }

    const credentials = Buffer.from(
      authHeader.substring(6),
      "base64",
    ).toString();
    const [authClientId, authClientSecret] = credentials.split(":");

    if (
      authClientId !== client_id ||
      authClientSecret !== clientData.client_secret
    ) {
      return res.status(401).json({
        error: "invalid_client",
        error_description: "Invalid client credentials",
      });
    }
  } else if (clientData.token_endpoint_auth_method === "client_secret_post") {
    const { client_secret } = req.body;
    if (!client_secret || client_secret !== clientData.client_secret) {
      return res.status(401).json({
        error: "invalid_client",
        error_description: "Invalid client secret",
      });
    }
  }

  // OAuth 2.1 Security: PKCE is mandatory for all clients
  if (!codeData.code_challenge) {
    return res.status(400).json({
      error: "invalid_grant",
      error_description:
        "Authorization code was not issued with PKCE challenge",
    });
  }

  if (!code_verifier) {
    return res.status(400).json({
      error: "invalid_request",
      error_description: "PKCE code verifier is required",
    });
  }

  // Verify code challenge
  const crypto = await import("crypto");
  let challengeFromVerifier: string;

  if (codeData.code_challenge_method === "S256") {
    const hash = crypto.createHash("sha256").update(code_verifier).digest();
    challengeFromVerifier = hash.toString("base64url");
  } else if (codeData.code_challenge_method === "plain") {
    challengeFromVerifier = code_verifier;
  } else {
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Unsupported code challenge method",
    });
  }

  if (challengeFromVerifier !== codeData.code_challenge) {
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "PKCE verification failed",
    });
  }

  // Code is valid, delete it (authorization codes are single-use)
  await oauthRepository.deleteAuthCode(code);

  const { access_token, refresh_token, expires_in } = await issueTokenPair(
    codeData.client_id,
    codeData.user_id,
    codeData.scope,
  );

  return res.json({
    access_token,
    token_type: "Bearer",
    expires_in,
    scope: codeData.scope,
    refresh_token,
  });
}

async function handleRefreshTokenGrant(
  req: express.Request,
  res: express.Response,
) {
  const { refresh_token, client_id } = req.body;

  if (!refresh_token) {
    return res.status(400).json({
      error: "invalid_request",
      error_description: "Missing refresh_token parameter",
    });
  }

  // Look up the token record by refresh token
  const tokenRecord = await oauthRepository.getByRefreshToken(refresh_token);
  if (!tokenRecord) {
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Invalid or unknown refresh token",
    });
  }

  // Verify client_id matches
  if (client_id && tokenRecord.client_id !== client_id) {
    return res.status(400).json({
      error: "invalid_client",
      error_description: "Client ID does not match the refresh token",
    });
  }

  // Check refresh token expiry
  if (
    !tokenRecord.refresh_token_expires_at ||
    Date.now() > tokenRecord.refresh_token_expires_at.getTime()
  ) {
    await oauthRepository.deleteAccessToken(tokenRecord.access_token);
    return res.status(400).json({
      error: "invalid_grant",
      error_description: "Refresh token has expired",
    });
  }

  // Rotate: delete the old record and issue a fresh token pair
  await oauthRepository.deleteAccessToken(tokenRecord.access_token);

  const { access_token, refresh_token: newRefreshToken, expires_in } =
    await issueTokenPair(
      tokenRecord.client_id,
      tokenRecord.user_id,
      tokenRecord.scope,
    );

  return res.json({
    access_token,
    token_type: "Bearer",
    expires_in,
    scope: tokenRecord.scope,
    refresh_token: newRefreshToken,
  });
}

/**
 * OAuth 2.0 Token Introspection Endpoint
 * Allows clients to introspect access tokens
 */
tokenRouter.post("/oauth/introspect", async (req, res) => {
  try {
    // Check if body was parsed correctly
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        error: "invalid_request",
        error_description: "Request body is missing or malformed",
      });
    }

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: "invalid_request",
        error_description: "Missing token parameter",
      });
    }

    // Check if token exists and is valid
    const tokenData = await oauthRepository.getAccessToken(token);

    if (!tokenData || !token.startsWith("mcp_token_")) {
      return res.json({
        active: false,
      });
    }

    // Check if token has expired
    if (Date.now() > tokenData.expires_at.getTime()) {
      await oauthRepository.deleteAccessToken(token);
      return res.json({
        active: false,
      });
    }

    // Token is active, return introspection details
    res.json({
      active: true,
      scope: tokenData.scope,
      client_id: "mcp_client", // In production, store and return actual client_id
      token_type: "Bearer",
      exp: Math.floor(tokenData.expires_at.getTime() / 1000),
      iat: Math.floor((tokenData.expires_at.getTime() - 3600 * 1000) / 1000), // Issued 1 hour before expiry
      sub: tokenData.user_id,
    });
  } catch (error) {
    logger.error("Error in OAuth introspect endpoint:", error);
    res.status(500).json({
      error: "server_error",
      error_description: "Internal server error",
    });
  }
});

/**
 * OAuth 2.0 Token Revocation Endpoint
 * Allows clients to revoke access tokens
 */
tokenRouter.post("/oauth/revoke", async (req, res) => {
  try {
    // Check if body was parsed correctly
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        error: "invalid_request",
        error_description: "Request body is missing or malformed",
      });
    }

    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: "invalid_request",
        error_description: "Missing token parameter",
      });
    }

    // Revoke the token by removing it from storage
    if (await oauthRepository.getAccessToken(token)) {
      await oauthRepository.deleteAccessToken(token);
    } else {
      // RFC 7009 specifies that the endpoint should return success even if token doesn't exist
    }

    // RFC 7009 specifies that revocation endpoint should return 200 OK
    res.status(200).send();
  } catch (error) {
    logger.error("Error in OAuth revoke endpoint:", error);
    res.status(500).json({
      error: "server_error",
      error_description: "Internal server error",
    });
  }
});

export default tokenRouter;
