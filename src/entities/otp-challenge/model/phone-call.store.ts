import type { OtpVerification, PhoneCallChallenge } from '../schema/otp-challenge.schema'
import type { OtpPurpose } from '@/shared/model/otp'
import { ErrorCode, getErrorMessage, matchError } from '@/shared/api'
import { getPhoneCallStatus, startPhoneCall } from '../api'

/**
 * Состояния звонкового шага (шире, чем `status` в ответе): к серверным
 * `pending | verified | expired | failed` добавлены «старт» и те же исходы ошибок,
 * что у OTP-канала (`rateLimited`, `alreadyExists`, `error`).
 */
export type PhoneCallState
  = | 'idle'
    | 'starting'
    | 'waiting'
    | 'verified'
    | 'expired'
    | 'failed'
    | 'rateLimited'
    | 'alreadyExists'
    | 'error'

/** Рекомендованный контрактом интервал опроса — 3–5 с (бэкенд троттлит провайдера). */
const POLL_INTERVAL_MS = 4000

/** Сколько подряд неудачных опросов терпим, прежде чем показать «сеть недоступна». */
const MAX_POLL_FAILURES = 3

/**
 * Звонковый канал подтверждения телефона (контракт v1.2, ADR-0014).
 *
 * Особенности, ради которых отдельный стор:
 * - терминальные состояния приходят **`200 + status`**, а не ошибкой;
 * - `verificationToken` появляется **асинхронно** при опросе, поэтому наружу он уходит
 *   не полем состояния, а результатом `awaitVerification()`: одноразовый секрет живёт
 *   в замыкании и не попадает в реактивное состояние (ADR-0011 § Anti-patterns);
 * - счётчика попыток нет и здесь — пользователь либо ждёт, либо перезапускает шаг.
 */
export const usePhoneCallStore = defineStore('phone-call', () => {
  const state = ref<PhoneCallState>('idle')
  const challenge = ref<PhoneCallChallenge | null>(null)
  const error = ref<string | null>(null)
  /** Причина отказа провайдера (поле `reason` при `status: 'failed'`). */
  const reason = ref<string | null>(null)
  /** Параметры старта — нужны для `restart()` после истечения окна. */
  const request = ref<{ phone: string, purpose: OtpPurpose } | null>(null)

  const now = ref(Date.now())
  let ticker: ReturnType<typeof setInterval> | null = null
  let poller: ReturnType<typeof setTimeout> | null = null
  let pollFailures = 0

  let token: string | null = null
  let settle: {
    resolve: (value: OtpVerification) => void
    reject: (cause: unknown) => void
  } | null = null

  const isActive = computed(() => state.value === 'starting' || state.value === 'waiting')

  const expiresInLeft = computed(() => {
    const until = challenge.value?.expiresAt.getTime() ?? null
    if (until === null) {
      return 0
    }
    return Math.max(0, Math.ceil((until - now.value) / 1000))
  })

  const canRestart = computed(() => request.value !== null
    && !isActive.value
    && (state.value === 'expired' || state.value === 'failed' || state.value === 'error'))

  function startTicker (): void {
    ticker ??= setInterval(() => {
      now.value = Date.now()
    }, 1000)
  }

  function stop (): void {
    if (ticker) {
      clearInterval(ticker)
      ticker = null
    }
    if (poller) {
      clearTimeout(poller)
      poller = null
    }
  }

  /** Старт звонкового челленджа. Anti-enumeration — на стороне бэкенда. */
  async function start (phone: string, purpose: OtpPurpose): Promise<PhoneCallChallenge> {
    state.value = 'starting'
    clearError()

    try {
      const created = await startPhoneCall(phone, purpose)
      challenge.value = created
      request.value = { phone, purpose }
      token = null
      pollFailures = 0
      now.value = Date.now()
      startTicker()
      state.value = 'waiting'
      schedulePoll()
      return created
    } catch (error_) {
      applyStartError(error_)
      throw error_
    }
  }

  /**
   * Дождаться подтверждения звонка: резолвится одноразовым `verificationToken`,
   * реджектится при `expired` / `failed` / сбросе — вызывающий флоу просто `await`-ит.
   */
  function awaitVerification (): Promise<OtpVerification> {
    const current = challenge.value
    if (current && token) {
      return Promise.resolve({ challengeId: current.challengeId, verificationToken: token })
    }

    return new Promise<OtpVerification>((resolve, reject) => {
      settle = { resolve, reject }
    })
  }

  /** Перезапуск после `expired` / `failed`: новый челлендж вытесняет прежний на бэкенде. */
  async function restart (): Promise<PhoneCallChallenge> {
    const current = request.value
    if (!current) {
      throw new Error('No phone call request to restart')
    }
    return start(current.phone, current.purpose)
  }

  /** Сброс перед новым сценарием: гасим таймеры и снимаем ожидающих. */
  function reset (): void {
    stop()
    rejectPending(new Error('Phone call verification was reset'))
    state.value = 'idle'
    challenge.value = null
    request.value = null
    token = null
    pollFailures = 0
    clearError()
  }

  function clearError (): void {
    error.value = null
    reason.value = null
  }

  function schedulePoll (): void {
    if (poller) {
      return
    }
    poller = setTimeout(() => {
      poller = null
      void poll()
    }, POLL_INTERVAL_MS)
  }

  async function poll (): Promise<void> {
    const current = challenge.value
    if (!current || !isActive.value) {
      return
    }

    try {
      const result = await getPhoneCallStatus(current.challengeId)
      pollFailures = 0

      if (result.status === 'verified') {
        token = result.verificationToken
        state.value = 'verified'
        stop()
        settle?.resolve({
          challengeId: result.challengeId,
          verificationToken: result.verificationToken ?? '',
        })
        settle = null
        return
      }

      if (result.status === 'expired') {
        state.value = 'expired'
        stop()
        rejectPending(new Error('Phone call challenge expired'))
        return
      }

      if (result.status === 'failed') {
        state.value = 'failed'
        reason.value = result.reason
        stop()
        rejectPending(new Error('Phone call verification failed'))
        return
      }

      // `pending` — ждём дальше.
      schedulePoll()
    } catch (error_) {
      pollFailures += 1
      if (pollFailures >= MAX_POLL_FAILURES) {
        state.value = 'error'
        error.value = getErrorMessage(error_)
        stop()
        rejectPending(error_)
        return
      }
      schedulePoll()
    }
  }

  function rejectPending (cause: unknown): void {
    settle?.reject(cause instanceof Error ? cause : new Error(String(cause)))
    settle = null
  }

  function applyStartError (err: unknown): void {
    error.value = getErrorMessage(err)

    if (matchError(err, ErrorCode.OTP_RATE_LIMITED)) {
      state.value = 'rateLimited'
      return
    }

    if (matchError(err, ErrorCode.CONTACT_ALREADY_EXISTS)) {
      state.value = 'alreadyExists'
      return
    }

    state.value = 'error'
  }

  return {
    state,
    challenge,
    error,
    reason,
    isActive,
    expiresInLeft,
    canRestart,
    start,
    awaitVerification,
    restart,
    reset,
  }
})
