import type { PhoneCallResult } from '../schema/otp-challenge.schema'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorCode, HttpError } from '@/shared/api'
import { getPhoneCallStatus, startPhoneCall } from '../api'
import { usePhoneCallStore } from './phone-call.store'

vi.mock('../api', () => ({
  startPhoneCall: vi.fn(),
  getPhoneCallStatus: vi.fn(),
}))

const startMock = vi.mocked(startPhoneCall)
const statusMock = vi.mocked(getPhoneCallStatus)

const POLL = 4000

function challenge () {
  return {
    challengeId: 'call_1',
    callTo: '+7 (800) 500-8275',
    expiresAt: new Date(Date.now() + 300_000),
    cooldownSeconds: 60,
  }
}

function result (values: Partial<PhoneCallResult> = {}): PhoneCallResult {
  return {
    challengeId: 'call_1',
    status: 'pending',
    verificationToken: null,
    reason: null,
    ...values,
  }
}

describe('usePhoneCallStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    startMock.mockReset()
    statusMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('start: waiting + опрос «pending» продолжается, окно тикает', async () => {
    startMock.mockResolvedValue(challenge())
    statusMock.mockResolvedValue(result({ status: 'pending' }))
    const store = usePhoneCallStore()

    await store.start('+79991234567', 'sign-in')

    expect(store.state).toBe('waiting')
    expect(store.challenge?.callTo).toBe('+7 (800) 500-8275')
    expect(store.expiresInLeft).toBe(300)
    expect(store.isActive).toBe(true)

    await vi.advanceTimersByTimeAsync(POLL)
    expect(statusMock).toHaveBeenCalledWith('call_1')

    await vi.advanceTimersByTimeAsync(POLL)
    expect(statusMock).toHaveBeenCalledTimes(2)
    expect(store.state).toBe('waiting')
  })

  it('verified: awaitVerification резолвится токеном, опрос останавливается', async () => {
    startMock.mockResolvedValue(challenge())
    statusMock
      .mockResolvedValueOnce(result({ status: 'pending' }))
      .mockResolvedValue(result({ status: 'verified', verificationToken: 'vt-call' }))
    const store = usePhoneCallStore()

    await store.start('+79991234567', 'sign-up')
    const verification = store.awaitVerification()

    await vi.advanceTimersByTimeAsync(POLL)
    await vi.advanceTimersByTimeAsync(POLL)

    await expect(verification).resolves.toEqual({
      challengeId: 'call_1',
      verificationToken: 'vt-call',
    })
    expect(store.state).toBe('verified')

    await vi.advanceTimersByTimeAsync(POLL * 5)
    expect(statusMock).toHaveBeenCalledTimes(2)
  })

  it('expired: статус и отказ ожидающего, затем restart берёт новый челлендж', async () => {
    startMock.mockResolvedValueOnce(challenge()).mockResolvedValueOnce(challenge())
    statusMock.mockResolvedValue(result({ status: 'expired' }))
    const store = usePhoneCallStore()

    await store.start('+79991234567', 'sign-up')
    const verification = store.awaitVerification()
    const rejected = expect(verification).rejects.toThrow()

    await vi.advanceTimersByTimeAsync(POLL)
    await rejected

    expect(store.state).toBe('expired')
    expect(store.canRestart).toBe(true)

    await store.restart()
    expect(startMock).toHaveBeenCalledTimes(2)
    expect(store.state).toBe('waiting')
  })

  it('failed: причина показывается, ожидающий получает отказ', async () => {
    startMock.mockResolvedValue(challenge())
    statusMock.mockResolvedValue(result({ status: 'failed', reason: 'номер не совпал' }))
    const store = usePhoneCallStore()

    await store.start('+79991234567', 'sign-in')
    const verification = store.awaitVerification()
    const rejected = expect(verification).rejects.toThrow()

    await vi.advanceTimersByTimeAsync(POLL)
    await rejected

    expect(store.state).toBe('failed')
    expect(store.reason).toBe('номер не совпал')
    expect(store.canRestart).toBe(true)
  })

  it('rateLimited на старте: текст из реестра, опрос не запускается', async () => {
    startMock.mockRejectedValue(
      new HttpError(422, 'Domain', ErrorCode.OTP_RATE_LIMITED, 'raw', { retryAfter: 42 }),
    )
    const store = usePhoneCallStore()

    await expect(store.start('+79991234567', 'sign-in')).rejects.toThrow()

    expect(store.state).toBe('rateLimited')
    expect(store.error).toBe('Слишком частые запросы кода. Подождите немного')

    await vi.advanceTimersByTimeAsync(POLL * 3)
    expect(statusMock).not.toHaveBeenCalled()
  })

  it('три неудачных опроса подряд → error, ожидающий снят', async () => {
    startMock.mockResolvedValue(challenge())
    statusMock.mockRejectedValue(new HttpError(503, 'Unavailable', 'ServiceUnavailable', 'down'))
    const store = usePhoneCallStore()

    await store.start('+79991234567', 'sign-in')
    const verification = store.awaitVerification()
    const rejected = expect(verification).rejects.toThrow()

    await vi.advanceTimersByTimeAsync(POLL)
    expect(store.state).toBe('waiting')

    await vi.advanceTimersByTimeAsync(POLL)
    expect(store.state).toBe('waiting')

    await vi.advanceTimersByTimeAsync(POLL)
    await rejected

    expect(store.state).toBe('error')
    expect(store.error).toBeTruthy()
  })

  it('reset: idle и снятие ожидающего', async () => {
    startMock.mockResolvedValue(challenge())
    statusMock.mockResolvedValue(result({ status: 'pending' }))
    const store = usePhoneCallStore()

    await store.start('+79991234567', 'sign-in')
    const verification = store.awaitVerification()
    const rejected = expect(verification).rejects.toThrow()

    store.reset()
    await rejected

    expect(store.state).toBe('idle')
    expect(store.challenge).toBeNull()
    expect(store.canRestart).toBe(false)
  })
})
