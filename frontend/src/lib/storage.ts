/** localStorage helpers that never throw (private windows, blocked storage). */

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`drawcode.${key}`);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(`drawcode.${key}`, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: the app still works, it just won't persist.
  }
}
