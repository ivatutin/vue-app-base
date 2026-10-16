import type { OtpChallenge, OtpVerification } from '../schema/otp-challenge.schema'
import type { OtpPurpose } from '@/shared/model/otp'
import { ErrorCode, getErrorMessage, getRetryAfter, HttpError, matchError } from '@/shared/api'
import { sendOtp, verifyOtp } from '../api'

/**
 * Состояния челленджа. Расширяют диаграмму из [ADR-0011](../../../../docs/adr/0011-otp-verification-model.md)
 * (§ FSM) терминальными исходами, которые UI показывает по-разному:
 *
 * - `invalid` — неверный код: остаться на экране ввода, поле очистить;
 * - `expired` — челлендж не найден/истёк: начать заново;
 * - `locked` — попытки исчерпаны (5), ясно предлагаем resend;
 * - `rateLimited` — лимит отправок: таймер из `details.retryAfter`;
 * - `alreadyExists` — `409 ContactAlreadyExists` (только `sign-up`): уводим на
 *   экран «проверьте почту»;
 * - `failed` — всё остальное (неизвестный код, сеть, 5xx).
 *
 * Счётчик оставшихся попыток **не держим**: контракт его не отдаёт (ни в ответе
 * `verify`, ни в `details` ошибок) — выдуманное число в UI хуже, чем его отсутствие.
 */
export type OtpChallengeStatus
  = | 'idle'
    | 'sending'
    | 'sent'
    | 'verifying'
    | 'verified'
    | 'invalid'
    | 'expired'
    | 'locked'
    | 'rateLimited'
    | 'alreadyExists'
    | 'failed'

/** Параметры последней отправки — нужны для `resend` (в домене `target` замаскирован). */
interface OtpRequest {
  target: string
  purpose: OtpPurpose
}

const TICK_MS = 1000

/**
 * Один активный челлендж единовременно ([ADR-0011](../../../../docs/adr/0011-otp-verification-model.md)).
 * Состояние эфемерное: ни `challengeId`, ни `verificationToken` не persist'ятся.
 */
export const useOtpChallengeStore = defineStore('otp-challenge', () => {
  const status = ref<OtpChallengeStatus>('idle')
  const challenge = ref<OtpChallenge | null>(null)
  const error = ref<string | null>(null)
  const errorCode = ref<ErrorCode | null>(null)
  const retryAfterSeconds = ref(0)
  /** Момент (ms epoch), до которого повторная отправка запрещена. */
  const cooldownUntil = ref<number | null>(null)

  /** Сырой телефон последней отправки — только в памяти, для `resend`. */
  const request = ref<OtpRequest | null>(null)

  // Тикер обслуживает оба таймера UI: остаток cooldown и остаток жизни кода.
  const now = ref(Date.now())
  let ticker: ReturnType<typeof setInterval> | null = null

  const isBusy = computed(() => status.value === 'sending' || status.value === 'verifying')
  const cooldownLeft = computed(() => secondsUntil(cooldownUntil.value))
  const expiresInLeft = computed(() => secondsUntil(challenge.value?.expiresAt.getTime() ?? null))
  const canResend = computed(() => !isBusy.value && challenge.value !== null && cooldownLeft.value === 0)

  function secondsUntil (until: number | null): number {
    if (until === null) {
      return 0
    }
    return Math.max(0, Math.ceil((until - now.value) / 1000))
  }

  function startTicker (): void {
    if (ticker) {
      return
    }
    ticker = setInterval(() => {
      now.value = Date.now()
      if (cooldownLeft.value === 0 && expiresInLeft.value === 0) {
        stopTicker()
      }
    }, TICK_MS)
  }

  function stopTicker (): void {
    if (ticker) {
      clearInterval(ticker)
      ticker = null
    }
  }

  /** Запрос кода. Anti-enumeration — на стороне бэкенда (см. `api/index.ts`). */
  async function send (target: string, purpose: OtpPurpose): Promise<OtpChallenge> {
    status.value = 'sending'
    clearError()

    try {
      const result = await sendOtp(target, purpose)
      challenge.value = result
      request.value = { target, purpose }
      cooldownUntil.value = Date.now() + result.cooldownSeconds * 1000
      retryAfterSeconds.value = 0
      now.value = Date.now()
      startTicker()
      status.value = 'sent'
      return result
    } catch (error_) {
      applyError(error_)
      throw error_
    }
  }

  /**
   * Повторная отправка: бэкенд вытесняет прежний челлендж на `(target, purpose)`,
   * поэтому идём тем же путём, что и первая отправка, — с сохранёнными параметрами
   * (замаскированный `target` из домена для отправки не годится).
   */
  async function resend (): Promise<OtpChallenge> {
    const current = request.value
    if (!current) {
      throw new Error('No active OTP request to resend')
    }
    return send(current.target, current.purpose)
  }

  /**
   * Проверка кода. Успех возвращает `verificationToken` вызывающему коду —
   * стор его не хранит (ADR-0011 § Anti-patterns).
   */
  async function verify (code: string): Promise<OtpVerification> {
    const current = challenge.value
    if (!current) {
      throw new Error('No active OTP challenge to verify')
    }

    status.value = 'verifying'
    clearError()

    try {
      const verification = await verifyOtp(current.challengeId, code)
      // Челлендж израсходован на бэкенде — таймеры больше не нужны.
      stopTicker()
      status.value = 'verified'
      return verification
    } catch (error_) {
      applyError(error_)
      throw error_
    }
  }

  /** Сброс перед новым сценарием (смена target/purpose, уход с экрана). */
  function reset (): void {
    stopTicker()
    status.value = 'idle'
    challenge.value = null
    request.value = null
    retryAfterSeconds.value = 0
    cooldownUntil.value = null
    clearError()
  }

  /** Пользователь закрыл сообщение об ошибке — возвращаем рабочий статус. */
  function dismissError (): void {
    clearError()
    if (status.value !== 'verified') {
      status.value = challenge.value ? 'sent' : 'idle'
    }
  }

  function clearError (): void {
    error.value = null
    errorCode.value = null
  }

  function applyError (err: unknown): void {
    error.value = getErrorMessage(err)
    errorCode.value = err instanceof HttpError ? (err.errorName as ErrorCode) : null

    if (matchError(err, ErrorCode.OTP_RATE_LIMITED)) {
      const retryAfter = getRetryAfter(err) ?? 0
      retryAfterSeconds.value = retryAfter
      cooldownUntil.value = Date.now() + retryAfter * 1000
      now.value = Date.now()
      startTicker()
      status.value = 'rateLimited'
      return
    }

    if (matchError(err, ErrorCode.OTP_INVALID)) {
      status.value = 'invalid'
      return
    }

    if (matchError(err, ErrorCode.OTP_EXPIRED)) {
      stopTicker()
      status.value = 'expired'
      return
    }

    if (matchError(err, ErrorCode.OTP_TOO_MANY_ATTEMPTS)) {
      status.value = 'locked'
      return
    }

    if (matchError(err, ErrorCode.CONTACT_ALREADY_EXISTS)) {
      status.value = 'alreadyExists'
      return
    }

    status.value = 'failed'
  }

  return {
    status,
    challenge,
    error,
    errorCode,
    retryAfterSeconds,
    cooldownLeft,
    expiresInLeft,
    canResend,
    isBusy,
    send,
    resend,
    verify,
    reset,
    dismissError,
  }
})
