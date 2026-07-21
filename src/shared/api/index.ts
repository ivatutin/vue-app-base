export {
  ERROR_MESSAGES,
  ErrorCode,
  getErrorMessage,
  getRetryAfter,
  matchError,
} from './error-codes'
export {
  classifyFailure,
  FAILURE_MESSAGES,
  getFailureMessage,
  isOffline,
  isRetryableFailure,
} from './failure'
export type { FailureKind } from './failure'
export { HttpClient } from './http-client'
export type { HttpClientOptions, RequestOptions } from './http-client'
export { HttpError } from './http-error'
export { getHttpClient, setHttpClient } from './instance'
