export function isSafeExternalUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function sanitizeExternalUrl(url?: string | null) {
  if (!url) return null;
  const trimmed = url.trim();
  return trimmed && isSafeExternalUrl(trimmed) ? trimmed : null;
}

export function sanitizeCallbackUrl(callbackURL: string | null | undefined) {
  if (!callbackURL) return "/dashboard";
  try {
    const decoded = decodeURIComponent(callbackURL);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/dashboard";
    const parsed = new URL(decoded, "https://dashboard.local");
    const safePath = parsed.pathname;
    if (!/^\/(dashboard|museums|accept-invitation)(\/|$)/.test(safePath)) {
      return "/dashboard";
    }
    return `${safePath}${parsed.search}${parsed.hash}`;
  } catch {
    return "/dashboard";
  }
}
