import type { HttpClient } from '@/shared/api'
import { describe, expect, it, vi } from 'vitest'
import { setHttpClient } from '@/shared/api'
import { getPhoneCallStatus, startPhoneCall } from './index'

const PHONE = '+79991234567'

const challengeDto = {
  challengeId: 'call_1',
  channel: 'phone',
  method: 'call',
  callTo: '+7 (800) 500-8275',
  expiresAt: '2026-10-16T12:00:00.000Z',
  cooldownSeconds: 60,
  otpFallback: true,
}

interface Stub {
  post?: (path: string, body?: unknown, options?: unknown) => Promise<unknown>
  get?: (path: string, options?: unknown) => Promise<unknown>
}

function stub (impl: Stub) {
  const post = vi.fn(impl.post ?? (async () => undefined))
  const get = vi.fn(impl.get ?? (async () => undefined))
  setHttpClient({ post, get } as unknown as HttpClient)
  return { post, get }
}

describe('phone-call api', () => {
  it('startPhoneCall: POST /auth/phone/call с телом контракта и без Bearer', async () => {
    const { post } = stub({ post: async () => challengeDto })

    const challenge = await startPhoneCall(PHONE, 'sign-up')

    expect(post).toHaveBeenCalledWith(
      '/auth/phone/call',
      { phone: PHONE, purpose: 'sign-up' },
      { auth: false },
    )
    expect(challenge.challengeId).toBe('call_1')
    expect(challenge.callTo).toBe('+7 (800) 500-8275')
    expect(challenge.expiresAt).toBeInstanceOf(Date)
  })

  it('startPhoneCall: телефон не в E.164 отсекается до сети', async () => {
    const { post } = stub({ post: async () => challengeDto })

    await expect(startPhoneCall('89991234567', 'sign-up')).rejects.toThrow()

    expect(post).not.toHaveBeenCalled()
  })

  it('startPhoneCall: неожиданная форма ответа → ошибка валидации DTO', async () => {
    stub({ post: async () => ({ challengeId: 'call_1' }) })

    await expect(startPhoneCall(PHONE, 'sign-up')).rejects.toThrow()
  })

  it('getPhoneCallStatus: GET с закодированным id, отсутствующие поля → null', async () => {
    const { get } = stub({ get: async () => ({ challengeId: 'call 1', status: 'pending' }) })

    const result = await getPhoneCallStatus('call 1')

    expect(get).toHaveBeenCalledWith('/auth/phone/call/call%201', { auth: false })
    expect(result).toEqual({
      challengeId: 'call 1',
      status: 'pending',
      verificationToken: null,
      reason: null,
    })
  })

  it('getPhoneCallStatus: verified с токеном и failed с причиной разбираются', async () => {
    stub({ get: async () => ({ challengeId: 'call_1', status: 'verified', verificationToken: 'vt' }) })
    await expect(getPhoneCallStatus('call_1')).resolves.toEqual({
      challengeId: 'call_1',
      status: 'verified',
      verificationToken: 'vt',
      reason: null,
    })

    stub({ get: async () => ({ challengeId: 'call_1', status: 'failed', reason: 'номер не совпал' }) })
    await expect(getPhoneCallStatus('call_1')).resolves.toEqual({
      challengeId: 'call_1',
      status: 'failed',
      verificationToken: null,
      reason: 'номер не совпал',
    })
  })

  it('getPhoneCallStatus: неизвестный статус → ошибка валидации', async () => {
    stub({ get: async () => ({ challengeId: 'call_1', status: 'wat' }) })

    await expect(getPhoneCallStatus('call_1')).rejects.toThrow()
  })
})
