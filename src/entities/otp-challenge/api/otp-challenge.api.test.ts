import type { HttpClient } from '@/shared/api'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpError, setHttpClient } from '@/shared/api'
import { sendOtp, verifyOtp } from './index'

const PHONE = '+79991234567'

const validChallenge = {
  challengeId: 'ch_1',
  channel: 'phone',
  target: '+7 (***) ***-12-34',
  expiresAt: '2026-10-16T12:00:00.000Z',
  cooldownSeconds: 60,
  codeLength: 6,
}

function stubPost (
  impl: (path: string, body?: unknown, options?: unknown) => Promise<unknown>,
): ReturnType<typeof vi.fn> {
  const post = vi.fn(impl)
  setHttpClient({ post } as unknown as HttpClient)
  return post
}

describe('otp-challenge api', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sendOtp: POST /auth/otp/send с телом контракта и без Bearer (public)', async () => {
    const post = stubPost(async () => validChallenge)

    const challenge = await sendOtp(PHONE, 'sign-in')

    expect(post).toHaveBeenCalledWith(
      '/auth/otp/send',
      { channel: 'phone', target: PHONE, purpose: 'sign-in' },
      { auth: false },
    )
    expect(challenge.challengeId).toBe('ch_1')
    expect(challenge.expiresAt).toBeInstanceOf(Date)
    expect(challenge.target).toBe('+7 (***) ***-12-34')
  })

  it('sendOtp: телефон не в E.164 отсекается до сети', async () => {
    const post = stubPost(async () => validChallenge)

    await expect(sendOtp('89991234567', 'sign-in')).rejects.toThrow()

    expect(post).not.toHaveBeenCalled()
  })

  it('sendOtp: неожиданная форма ответа → ошибка валидации DTO', async () => {
    stubPost(async () => ({ challengeId: 'ch_1' }))

    await expect(sendOtp(PHONE, 'sign-in')).rejects.toThrow()
  })

  it('verifyOtp: POST /auth/otp/verify, наружу — только challengeId и токен', async () => {
    const post = stubPost(async () => ({
      challengeId: 'ch_1',
      verified: true,
      verificationToken: 'vt_1',
    }))

    const verification = await verifyOtp('ch_1', '123456')

    expect(post).toHaveBeenCalledWith(
      '/auth/otp/verify',
      { challengeId: 'ch_1', code: '123456' },
      { auth: false },
    )
    expect(verification).toEqual({ challengeId: 'ch_1', verificationToken: 'vt_1' })
  })

  it('verifyOtp: код не из 6 цифр отсекается до сети', async () => {
    const post = stubPost(async () => ({
      challengeId: 'ch_1',
      verified: true,
      verificationToken: 'vt_1',
    }))

    await expect(verifyOtp('ch_1', '123')).rejects.toThrow()

    expect(post).not.toHaveBeenCalled()
  })

  it('пробрасывает HttpError клиента как есть — по нему матчит стор', async () => {
    const err = new HttpError(422, 'Domain', 'OtpInvalid', 'Invalid OTP code')
    stubPost(async () => {
      throw err
    })

    await expect(verifyOtp('ch_1', '000000')).rejects.toBe(err)
  })
})
