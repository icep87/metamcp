/**
 * In-memory store for per-session forwarded headers.
 * Populated at session open, deleted at session cleanup.
 */

const store = new Map<string, Record<string, string>>();

const sensitiveHeaderNameParts = [
  "authorization",
  "cookie",
  "credential",
  "key",
  "password",
  "secret",
  "token",
] as const;

const isSensitiveHeaderName = (headerName: string): boolean => {
  const normalized = headerName.toLowerCase();
  return sensitiveHeaderNameParts.some((part) => normalized.includes(part));
};

const sanitizeHeaderValueForDebugLog = (
  name: string,
  value: string,
): string => {
  if (name.toLowerCase() === "authorization") {
    const [scheme] = value.trim().split(/\s+/, 1);
    return scheme ? `${scheme} [redacted]` : "[redacted]";
  }

  return isSensitiveHeaderName(name) ? "[redacted]" : value;
};

export const sanitizeHeadersForDebugLog = (
  headers: Record<string, string>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([name, value]) => [
        name,
        sanitizeHeaderValueForDebugLog(name, value),
      ]),
  );

export const sessionHeadersStore = {
  set(sessionId: string, headers: Record<string, string>): void {
    store.set(sessionId, headers);
  },

  get(sessionId: string): Record<string, string> | undefined {
    return store.get(sessionId);
  },

  delete(sessionId: string): void {
    store.delete(sessionId);
  },

  /**
   * Filter incoming request headers by the endpoint's forwarded_headers allowlist.
   * Returns a Record of only the matching headers, with lowercased keys.
   */
  filterHeaders(
    reqHeaders: Record<string, string | string[] | undefined>,
    allowlist: string[],
  ): Record<string, string> {
    if (!allowlist || allowlist.length === 0) {
      return {};
    }

    const normalized = allowlist.map((h) => h.toLowerCase().trim());
    const result: Record<string, string> = {};

    for (const [key, value] of Object.entries(reqHeaders)) {
      if (normalized.includes(key.toLowerCase())) {
        // Take first value if array
        if (Array.isArray(value)) {
          if (value[0] !== undefined) result[key.toLowerCase()] = value[0];
        } else if (value !== undefined) {
          result[key.toLowerCase()] = value;
        }
      }
    }

    return result;
  },
};
