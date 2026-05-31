const RESERVED_USERNAMES = new Set([
  "admin",
  "support",
  "help",
  "museum",
  "api",
  "www",
  "null",
  "undefined",
  "root",
  "system",
  "moderator",
  "staff",
  "yami",
  "museumand",
]);

export type UsernameValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; error: string };

export function validateUsername(raw: string): UsernameValidationResult {
  const normalized = raw.trim().toLowerCase();

  if (normalized.length < 3) {
    return { ok: false, error: "Username must be at least 3 characters" };
  }
  if (normalized.length > 30) {
    return { ok: false, error: "Username must be at most 30 characters" };
  }
  if (!/^[a-z0-9_]+$/.test(normalized)) {
    return {
      ok: false,
      error: "Username can only contain letters, numbers, and underscores",
    };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return { ok: false, error: "This username is reserved" };
  }

  return { ok: true, normalized };
}
