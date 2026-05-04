/**
 * In-memory store for per-session forwarded headers.
 * Populated at session open, deleted at session cleanup.
 */

const store = new Map<string, Record<string, string>>();

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
