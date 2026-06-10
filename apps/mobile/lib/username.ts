const USERNAME_FORMAT_REGEX = /^[a-zA-Z0-9_]+$/;

export function getUsernameFormatError(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length < 3) return 'Username must be at least 3 characters';
  if (trimmed.length > 30) return 'Username must be at most 30 characters';
  if (!USERNAME_FORMAT_REGEX.test(trimmed)) {
    return 'Username can only contain letters, numbers, and underscores';
  }
  return null;
}

export function normalizeUsernameInput(raw: string): string {
  return raw.trim().toLowerCase();
}
