/**
 * Safely parse JSON with a fallback value
 * Prevents crashes from malformed JSON data
 */
export function safeJsonParse<T>(
  json: string | null | undefined,
  fallback: T
): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely stringify JSON with error handling
 * Returns null if stringification fails (e.g., circular references)
 */
export function safeJsonStringify(
  value: unknown,
  space?: number
): string | null {
  try {
    return JSON.stringify(value, null, space);
  } catch {
    return null;
  }
}
