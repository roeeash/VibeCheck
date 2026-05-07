export type ErrorCode =
  | 'E_DNS_FAILURE'
  | 'E_TIMEOUT'
  | 'E_BOT_BLOCKED'
  | 'E_CAPTCHA'
  | 'E_EMPTY_RESPONSE'
  | 'E_SSL_ERROR'
  | 'E_ENGINE_ERROR';

export interface AuditError {
  code: ErrorCode;
  message: string;       // user-facing, no stack traces
  actions: string[];     // actionable suggestions
}

export const ERROR_CATALOG: Record<ErrorCode, AuditError> = {
  E_DNS_FAILURE: {
    code: 'E_DNS_FAILURE',
    message: 'Could not resolve hostname',
    actions: [
      'Check that the URL is spelled correctly',
      'Verify you have internet connectivity',
      'The site may be behind a VPN you are not connected to',
    ],
  },
  E_TIMEOUT: {
    code: 'E_TIMEOUT',
    message: 'Page did not load within 30 seconds',
    actions: [
      'The site may be slow or unresponsive',
      'Try auditing a simpler page on the same domain first',
      'Check if the site requires authentication',
    ],
  },
  E_BOT_BLOCKED: {
    code: 'E_BOT_BLOCKED',
    message: 'Site blocked headless browser access',
    actions: [
      'Try auditing a staging or preview URL instead',
      'Some sites block automated tools — this is expected behavior',
    ],
  },
  E_CAPTCHA: {
    code: 'E_CAPTCHA',
    message: 'CAPTCHA detected — cannot proceed',
    actions: [
      'VibeCheck does not bypass CAPTCHAs',
      'Audit a staging URL that does not require CAPTCHA',
    ],
  },
  E_EMPTY_RESPONSE: {
    code: 'E_EMPTY_RESPONSE',
    message: 'Server returned an empty response',
    actions: [
      'Verify the URL returns a page in a browser',
      'The endpoint may require POST or authentication',
    ],
  },
  E_SSL_ERROR: {
    code: 'E_SSL_ERROR',
    message: 'SSL certificate error',
    actions: [
      'The site may have an expired or self-signed certificate',
      'If this is a local dev server, use http:// instead of https://',
    ],
  },
  E_ENGINE_ERROR: {
    code: 'E_ENGINE_ERROR',
    message: 'Audit engine encountered an internal error',
    actions: [
      'Check the audit log for details',
      'Try again — transient errors sometimes resolve on retry',
    ],
  },
};

export function classifyError(err: unknown): AuditError {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  if (msg.includes('dns') || msg.includes('getaddrinfo') || msg.includes('enotfound')) return { ...ERROR_CATALOG.E_DNS_FAILURE, message: err instanceof Error ? err.message : String(err) };
  if (msg.includes('timeout') || msg.includes('timed out')) return { ...ERROR_CATALOG.E_TIMEOUT, message: err instanceof Error ? err.message : String(err) };
  if (msg.includes('captcha')) return { ...ERROR_CATALOG.E_CAPTCHA, message: err instanceof Error ? err.message : String(err) };
  if (msg.includes('blocked') || msg.includes('403') || msg.includes('cloudflare')) return { ...ERROR_CATALOG.E_BOT_BLOCKED, message: err instanceof Error ? err.message : String(err) };
  if (msg.includes('ssl') || msg.includes('certificate') || msg.includes('self-signed')) return { ...ERROR_CATALOG.E_SSL_ERROR, message: err instanceof Error ? err.message : String(err) };
  if (msg.includes('empty') || msg.includes('empty response')) return { ...ERROR_CATALOG.E_EMPTY_RESPONSE, message: err instanceof Error ? err.message : String(err) };
  // Default: always include the raw error message
  return { ...ERROR_CATALOG.E_ENGINE_ERROR, message: err instanceof Error ? err.message : String(err) };
}
