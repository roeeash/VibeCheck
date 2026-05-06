const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
]);

const SENSITIVE_PATHS = ['/auth', '/login', '/token', '/session', '/password', '/secret'];

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADERS.has(key.toLowerCase())) {
      redacted[key] = '<redacted>';
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export function redactBody(url: string, body: string | undefined): string | undefined {
  if (!body) return undefined;
  const lowerUrl = url.toLowerCase();
  if (SENSITIVE_PATHS.some((p) => lowerUrl.includes(p))) {
    return '<redacted>';
  }
  return body;
}
