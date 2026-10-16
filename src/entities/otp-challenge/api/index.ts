import type { OtpChallenge, OtpVerification } from '../schema/otp-challenge.schema'
import type { OtpPurpose } from '@/shared/model/otp'
import { getHttpClient } from '@/shared/api'
import {
  otpChallengeDtoSchema,
  otpVerifiedDtoSchema,
  sendOtpBodyDtoSchema,
  verifyOtpBodyDtoSchema,
} from './otp-challenge.dto'
import { toOtpChallenge, toOtpVerification } from './otp-challenge.mapper'

/**
 * Запрос кода на телефон — `POST /auth/otp/send` (публичный).
 *
 * Anti-enumeration: для `purpose='sign-in'` бэкенд отвечает `200` и для
 * незарегистрированного номера; `409 ContactAlreadyExists` возможен только
 * при `purpose='sign-up'`.
 */
export async function sendOtp (target: string, purpose: OtpPurpose): Promise<OtpChallenge> {
  const body = sendOtpBodyDtoSchema.parse({ channel: 'phone', target, purpose })
  const raw = await getHttpClient().post<unknown>('/auth/otp/send', body, { auth: false })

  const parsed = otpChallengeDtoSchema.safeParse(raw)
  if (!parsed.success) {
    throw parsed.error
  }

  return toOtpChallenge(parsed.data)
}

/**
 * Проверка кода — `POST /auth/otp/verify` (публичный).
 *
 * Успех отдаёт одноразовый `verificationToken` **вызывающему коду**: в сторе
 * он не сохраняется, чтобы не переживать перезагрузку и не попадать в storage
 * (ADR-0011 § Anti-patterns).
 */
export async function verifyOtp (challengeId: string, code: string): Promise<OtpVerification> {
  const body = verifyOtpBodyDtoSchema.parse({ challengeId, code })
  const raw = await getHttpClient().post<unknown>('/auth/otp/verify', body, { auth: false })

  const parsed = otpVerifiedDtoSchema.safeParse(raw)
  if (!parsed.success) {
    throw parsed.error
  }

  return toOtpVerification(parsed.data)
}
