import type { OtpChallenge } from '../schema/otp-challenge.schema'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ERROR_MESSAGES, ErrorCode, HttpError } from '@/shared/api'
import { sendOtp, verifyOtp } from '../api'
import { useOtpChallengeStore } from './otp-challenge.store'

vi.mock('../api', () => ({
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
}))

const sendOtpMock = vi.mocked(sendOtp)
const verifyOtpMock = vi.mocked(verifyOtp)

const PHONE = '+79991234567'

function makeChallenge (
  overrides: { cooldownSeconds?: number, expiresInMs?: number, challengeId?: string } = {},
): OtpChallenge {
  return {
    challengeId: overrides.challengeId ?? 'ch_1',
    channel: 'phone',
    target: '+7 (***) ***-12-34',
    expiresAt: new Date(Date.now() + (overrides.expiresInMs ?? 300_000)),
    cooldownSeconds: overrides.cooldownSeconds ?? 60,
    codeLength: 6,
  }
}

function httpError (status: number, code: ErrorCode, details?: unknown): HttpError {
  return new HttpError(status, 'Domain', code, 'raw message', details)
}

describe('useOtpChallengeStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    sendOtpMock.mockReset()
    verifyOtpMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('начальное состояние — idle, челленджа нет', () => {
    const store = useOtpChallengeStore()

    expect(store.status).toBe('idle')
    expect(store.challenge).toBeNull()
    expect(store.canResend).toBe(false)
    expect(store.cooldownLeft).toBe(0)
  })

  it('send: успех → sent, челлендж сохранён, cooldown тикает до нуля', async () => {
    sendOtpMock.mockResolvedValue(makeChallenge({ cooldownSeconds: 60 }))
    const store = useOtpChallengeStore()

    await store.send(PHONE, 'sign-in')

    expect(sendOtpMock).toHaveBeenCalledWith(PHONE, 'sign-in')
    expect(store.status).toBe('sent')
    expect(store.challenge?.challengeId).toBe('ch_1')
    expect(store.cooldownLeft).toBe(60)
    expect(store.canResend).toBe(false)

    vi.advanceTimersByTime(30_000)
    expect(store.cooldownLeft).toBe(30)

    vi.advanceTimersByTime(30_000)
    expect(store.cooldownLeft).toBe(0)
    expect(store.canResend).toBe(true)
  })

  it('send: 409 ContactAlreadyExists → alreadyExists с текстом из реестра', async () => {
    sendOtpMock.mockRejectedValue(httpError(409, ErrorCode.CONTACT_ALREADY_EXISTS))
    const store = useOtpChallengeStore()

    await expect(store.send(PHONE, 'sign-up')).rejects.toThrow()

    expect(store.status).toBe('alreadyExists')
    expect(store.errorCode).toBe(ErrorCode.CONTACT_ALREADY_EXISTS)
    expect(store.error).toBe(ERROR_MESSAGES[ErrorCode.CONTACT_ALREADY_EXISTS])
  })

  it('send: OtpRateLimited на первой отправке — таймер, повтор открывается через send()', async () => {
    sendOtpMock.mockRejectedValueOnce(
      httpError(422, ErrorCode.OTP_RATE_LIMITED, { retryAfter: 42 }),
    )
    const store = useOtpChallengeStore()

    await expect(store.send(PHONE, 'sign-in')).rejects.toThrow()

    expect(store.status).toBe('rateLimited')
    expect(store.retryAfterSeconds).toBe(42)
    expect(store.cooldownLeft).toBe(42)
    // Челленджа ещё нет: повтор без параметров невозможен, но гейт кнопки не залипает.
    expect(store.canResend).toBe(false)
    expect(store.canRetrySend).toBe(false)
    await expect(store.resend()).rejects.toThrow('No active OTP request to resend')

    // Закрытие сообщения не разблокирует кнопку до конца cooldown и не врёт про статус.
    store.dismissError()
    expect(store.error).toBeNull()
    expect(store.status).toBe('rateLimited')
    expect(store.canRetrySend).toBe(false)

    vi.advanceTimersByTime(42_000)
    expect(store.cooldownLeft).toBe(0)
    expect(store.canRetrySend).toBe(true)

    // Выход из тупика: флоу повторяет send(target, purpose) — параметры у него есть.
    sendOtpMock.mockResolvedValueOnce(makeChallenge({ challengeId: 'ch_2' }))
    await store.send(PHONE, 'sign-in')

    expect(store.status).toBe('sent')
    expect(store.challenge?.challengeId).toBe('ch_2')
    expect(store.canResend).toBe(false)
  })

  it('send: неизвестная ошибка → failed с generic-сообщением', async () => {
    sendOtpMock.mockRejectedValue(new Error('boom'))
    const store = useOtpChallengeStore()

    await expect(store.send(PHONE, 'sign-in')).rejects.toThrow('boom')

    expect(store.status).toBe('failed')
    expect(store.errorCode).toBeNull()
    expect(store.error).toBe('Что-то пошло не так')
  })

  it('canRetrySend: после успешной отправки открывается только по истечении cooldown', async () => {
    sendOtpMock.mockResolvedValue(makeChallenge({ cooldownSeconds: 60 }))
    const store = useOtpChallengeStore()
    await store.send(PHONE, 'sign-in')

    expect(store.canRetrySend).toBe(false)
    expect(store.canResend).toBe(false)

    vi.advanceTimersByTime(30_000)
    expect(store.canRetrySend).toBe(false)

    vi.advanceTimersByTime(30_000)
    expect(store.canRetrySend).toBe(true)
    expect(store.canResend).toBe(true)
  })

  it('dismissError без челленджа: статус-причина блокировки сохраняется', async () => {
    sendOtpMock.mockRejectedValue(httpError(422, ErrorCode.OTP_RATE_LIMITED, { retryAfter: 30 }))
    const store = useOtpChallengeStore()
    await expect(store.send(PHONE, 'sign-in')).rejects.toThrow()

    store.dismissError()

    expect(store.error).toBeNull()
    expect(store.status).toBe('rateLimited')
    expect(store.cooldownLeft).toBe(30)
  })

  it('resend: те же параметры, новый челлендж подменяет прежний', async () => {
    sendOtpMock.mockResolvedValueOnce(makeChallenge({ challengeId: 'ch_1' }))
    const store = useOtpChallengeStore()
    await store.send(PHONE, 'sign-up')

    vi.advanceTimersByTime(60_000)
    sendOtpMock.mockResolvedValueOnce(makeChallenge({ challengeId: 'ch_2' }))
    await store.resend()

    expect(sendOtpMock).toHaveBeenLastCalledWith(PHONE, 'sign-up')
    expect(store.challenge?.challengeId).toBe('ch_2')
    expect(store.status).toBe('sent')
  })

  it('resend без активной отправки — rejects', async () => {
    const store = useOtpChallengeStore()

    await expect(store.resend()).rejects.toThrow('No active OTP request to resend')
  })

  it('verify: успех → verified, токен отдан вызывающему и не сохранён в сторе', async () => {
    sendOtpMock.mockResolvedValue(makeChallenge())
    verifyOtpMock.mockResolvedValue({ challengeId: 'ch_1', verificationToken: 'vt_1' })
    const store = useOtpChallengeStore()
    await store.send(PHONE, 'sign-in')

    const verification = await store.verify('123456')

    expect(verifyOtpMock).toHaveBeenCalledWith('ch_1', '123456')
    expect(verification.verificationToken).toBe('vt_1')
    expect(store.status).toBe('verified')
    expect('verificationToken' in store).toBe(false)
  })

  it('verify: OtpInvalid → invalid, челлендж остаётся активным', async () => {
    sendOtpMock.mockResolvedValue(makeChallenge())
    verifyOtpMock.mockRejectedValue(httpError(422, ErrorCode.OTP_INVALID))
    const store = useOtpChallengeStore()
    await store.send(PHONE, 'sign-in')

    await expect(store.verify('000000')).rejects.toThrow()

    expect(store.status).toBe('invalid')
    expect(store.error).toBe(ERROR_MESSAGES[ErrorCode.OTP_INVALID])
    expect(store.challenge?.challengeId).toBe('ch_1')
  })

  it('verify: OtpExpired → expired, OtpTooManyAttempts → locked', async () => {
    sendOtpMock.mockResolvedValue(makeChallenge())
    const store = useOtpChallengeStore()
    await store.send(PHONE, 'sign-in')

    verifyOtpMock.mockRejectedValueOnce(httpError(422, ErrorCode.OTP_EXPIRED))
    await expect(store.verify('111111')).rejects.toThrow()
    expect(store.status).toBe('expired')

    verifyOtpMock.mockRejectedValueOnce(httpError(422, ErrorCode.OTP_TOO_MANY_ATTEMPTS))
    await expect(store.verify('111111')).rejects.toThrow()
    expect(store.status).toBe('locked')
    expect(store.error).toBe(ERROR_MESSAGES[ErrorCode.OTP_TOO_MANY_ATTEMPTS])
  })

  it('verify без активного челленджа — rejects', async () => {
    const store = useOtpChallengeStore()

    await expect(store.verify('123456')).rejects.toThrow('No active OTP challenge to verify')
  })

  it('reset: возвращает idle и очищает челлендж, таймеры и ошибку', async () => {
    sendOtpMock.mockResolvedValue(makeChallenge())
    verifyOtpMock.mockRejectedValue(httpError(422, ErrorCode.OTP_INVALID))
    const store = useOtpChallengeStore()
    await store.send(PHONE, 'sign-in')
    await expect(store.verify('000000')).rejects.toThrow()

    store.reset()

    expect(store.status).toBe('idle')
    expect(store.challenge).toBeNull()
    expect(store.error).toBeNull()
    expect(store.errorCode).toBeNull()
    expect(store.cooldownLeft).toBe(0)
  })

  it('dismissError: гасит сообщение и возвращает «sent», пока челлендж жив', async () => {
    sendOtpMock.mockResolvedValue(makeChallenge())
    verifyOtpMock.mockRejectedValue(httpError(422, ErrorCode.OTP_INVALID))
    const store = useOtpChallengeStore()
    await store.send(PHONE, 'sign-in')
    await expect(store.verify('000000')).rejects.toThrow()

    store.dismissError()

    expect(store.error).toBeNull()
    expect(store.errorCode).toBeNull()
    expect(store.status).toBe('sent')
  })
})
