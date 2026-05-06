export type VibeErrorCode =
  | 'E_DNS_FAILURE'
  | 'E_TIMEOUT'
  | 'E_BOT_BLOCKED'
  | 'E_CAPTCHA'
  | 'E_EMPTY_RESPONSE'
  | 'E_SSL_ERROR'
  | 'E_ENGINE_ERROR'
  | 'E_MODULE_FAILURE'
  | 'E_INVALID_CONFIG';

export interface VibeError {
  code: VibeErrorCode;
  module: string;
  message: string;
  cause?: unknown;
  recoverable: boolean;
}

export function createVibeError(
  code: VibeErrorCode,
  module: string,
  message: string,
  options?: { cause?: unknown; recoverable?: boolean },
): VibeError {
  return {
    code,
    module,
    message,
    cause: options?.cause,
    recoverable: options?.recoverable ?? false,
  };
}
