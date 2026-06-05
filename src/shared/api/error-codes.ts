import { HttpError } from './http-error'

/**
 * Реестр доменных ошибок backend.
 *
 * Источник истины для `HttpError.errorName` значений, которые backend может
 * вернуть на любом endpoint. Frontend сравнивается с этим реестром через
 * `matchError(err, code)` для per-error UX вместо хрупкого
 * `err.message.includes('...')`.
 *
 * См. ADR-0012 (Error coding contract) и
 * docs/integration-backend.md (раздел «Формат ошибок»).
 */
export const ErrorCode = {
  // Auth / credentials
  INVALID_CREDENTIALS: 'InvalidCredentials',

  // Contacts (email / phone)
  CONTACT_ALREADY_EXISTS: 'ContactAlreadyExists',
  CONTACT_NOT_FOUND: 'ContactNotFound',
  CONTACT_ALREADY_VERIFIED: 'ContactAlreadyVerified',

  // OTP
  OTP_INVALID: 'OtpInvalid',
  OTP_EXPIRED: 'OtpExpired',
  OTP_TOO_MANY_ATTEMPTS: 'OtpTooManyAttempts',
  OTP_RATE_LIMITED: 'OtpRateLimited',

  // Tokens (short-lived)
  VERIFICATION_TOKEN_INVALID: 'VerificationTokenInvalid',
  VERIFICATION_TOKEN_EXPIRED: 'VerificationTokenExpired',
  CHANGE_TOKEN_EXPIRED: 'ChangeTokenExpired',
  REAUTH_TOKEN_INVALID: 'ReauthTokenInvalid',
  REAUTH_TOKEN_EXPIRED: 'ReauthTokenExpired',

  // Business rules
  CONTACT_CHANGE_ALREADY_PENDING: 'ContactChangeAlreadyPending',
  PASSWORD_POLICY_VIOLATION: 'PasswordPolicyViolation',
  TERMS_NOT_ACCEPTED: 'TermsNotAccepted',

  // Social / federated
  SOCIAL_AUTH_FAILED: 'SocialAuthFailed',
  PROVIDER_ACCOUNT_LINKED: 'ProviderAccountLinked',
} as const

// eslint-disable-next-line @typescript-eslint/no-redeclare -- идиоматичный TS-паттерн: const + одноимённый type живут в разных namespace
export type ErrorCode = typeof ErrorCode[keyof typeof ErrorCode]

/**
 * Проверка: ошибка — это HttpError с заданным errorName.
 *
 * ```ts
 * if (matchError(err, ErrorCode.CONTACT_ALREADY_EXISTS)) {
 *   setFieldError('email', 'Этот email уже зарегистрирован')
 * }
 * ```
 */
export function matchError (err: unknown, code: ErrorCode): boolean {
  return err instanceof HttpError && err.errorName === code
}

/**
 * Дефолтные сообщения для глобального error-handler'а
 * (например, через notification store, когда страница не обработала ошибку
 * локально и пробросила её дальше).
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_CREDENTIALS]: 'Неверные учётные данные',

  [ErrorCode.CONTACT_ALREADY_EXISTS]: 'Этот контакт уже зарегистрирован',
  [ErrorCode.CONTACT_NOT_FOUND]: 'Контакт не найден',
  [ErrorCode.CONTACT_ALREADY_VERIFIED]: 'Контакт уже подтверждён',

  [ErrorCode.OTP_INVALID]: 'Неверный код подтверждения',
  [ErrorCode.OTP_EXPIRED]: 'Срок действия кода истёк, запросите новый',
  [ErrorCode.OTP_TOO_MANY_ATTEMPTS]: 'Слишком много попыток. Запросите новый код',
  [ErrorCode.OTP_RATE_LIMITED]: 'Слишком частые запросы кода. Подождите немного',

  [ErrorCode.VERIFICATION_TOKEN_INVALID]: 'Подтверждение не прошло, начните заново',
  [ErrorCode.VERIFICATION_TOKEN_EXPIRED]: 'Срок действия подтверждения истёк',
  [ErrorCode.CHANGE_TOKEN_EXPIRED]: 'Сессия изменения контакта истекла',
  [ErrorCode.REAUTH_TOKEN_INVALID]: 'Подтверждение пароля недействительно',
  [ErrorCode.REAUTH_TOKEN_EXPIRED]: 'Подтвердите пароль ещё раз',

  [ErrorCode.CONTACT_CHANGE_ALREADY_PENDING]: 'Изменение контакта уже выполняется',
  [ErrorCode.PASSWORD_POLICY_VIOLATION]: 'Пароль не соответствует требованиям',
  [ErrorCode.TERMS_NOT_ACCEPTED]: 'Необходимо принять условия использования',

  [ErrorCode.SOCIAL_AUTH_FAILED]: 'Не удалось войти через провайдера',
  [ErrorCode.PROVIDER_ACCOUNT_LINKED]: 'Этот аккаунт уже связан с другим пользователем',
}

const ERROR_CODE_VALUES = new Set<string>(Object.values(ErrorCode))

/**
 * Получить пользовательское сообщение для ошибки.
 * Если errorName не в реестре — возвращает дефолт «Что-то пошло не так».
 */
export function getErrorMessage (err: unknown): string {
  if (err instanceof HttpError && ERROR_CODE_VALUES.has(err.errorName)) {
    return ERROR_MESSAGES[err.errorName as ErrorCode]
  }
  return 'Что-то пошло не так'
}

/**
 * Прочитать `details.retryAfter` (секунды) для OTP_RATE_LIMITED ошибки.
 * Возвращает `null` если это не rate-limit или payload не содержит retryAfter.
 */
export function getRetryAfter (err: unknown): number | null {
  if (!matchError(err, ErrorCode.OTP_RATE_LIMITED)) {
    return null
  }
  const details = (err as HttpError).details
  if (typeof details !== 'object' || details === null) {
    return null
  }
  const value = (details as { retryAfter?: unknown }).retryAfter
  return typeof value === 'number' ? value : null
}
