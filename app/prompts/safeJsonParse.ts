export function safeJsonParse<T>(value: string): T | undefined;
export function safeJsonParse<T>(value: string, fallback: T): T;
export function safeJsonParse<T>(value: string, fallback?: T): T | undefined {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
