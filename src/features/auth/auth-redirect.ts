const loginDestinations = /^\/(?:account|student|teacher|parent|admin|manager|support|workspace|courses)(?:\/|$)/;
const authenticationRoutes = /^\/(?:login|register|reset-password|account\/callback)(?:\/|$)/;

function hasUnsafePathSyntax(value: string) {
  return value.length > 2048 || value !== value.trim() || !value.startsWith("/") ||
    value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value);
}

function decodePath(value: string) {
  let decoded = value;
  for (let depth = 0; depth < 5; depth += 1) {
    if (hasUnsafePathSyntax(decoded)) return null;
    let next: string;
    try {
      next = decodeURIComponent(decoded);
    } catch {
      return null;
    }
    if (next === decoded) return decoded;
    decoded = next;
  }
  return null;
}

export function safeLoginNextPath(value: unknown, fallback = "/account?from=login") {
  if (typeof value !== "string" || hasUnsafePathSyntax(value)) return fallback;
  const decoded = decodePath(value);
  if (!decoded || !loginDestinations.test(decoded) || authenticationRoutes.test(decoded)) return fallback;
  return value;
}

export function assertInternalRedirect(destination: string) {
  const decoded = decodePath(destination);
  if (!decoded || !decoded.startsWith("/") || decoded.startsWith("//")) {
    throw new Error("Unsafe redirect destination");
  }
}
