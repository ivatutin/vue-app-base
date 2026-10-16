import type { OtpChallenge, OtpVerification, PhoneCallChallenge, PhoneCallResult } from '../schema/otp-challenge.schema'
import type { OtpPurpose } from '@/shared/model/otp'
import { getHttpClient } from '@/shared/api'
import {
  otpChallengeDtoSchema,
  otpVerifiedDtoSchema,
  sendOtpBodyDtoSchema,
  verifyOtpBodyDtoSchema,
} from './otp-challenge.dto'
import { toOtpChallenge, toOtpVerification } from './otp-challenge.mapper'
import { phoneCallChallengeDtoSchema, phoneCallStatusDtoSchema, startPhoneCallBodyDtoSchema } from './phone-call.dto'
import { toPhoneCallChallenge, toPhoneCallResult } from './phone-call.mapper'

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

/**
 * Старт звонкового челленджа — `POST /auth/phone/call` (публичный, контракт v1.2).
 *
 * Anti-enumeration как у `otp/send`: для `purpose='sign-in'` бэкенд отвечает `200`
 * и на незарегистрированный номер. `callTo` — общий сервисный номер.
 */
export async function startPhoneCall (phone: string, purpose: OtpPurpose): Promise<PhoneCallChallenge> {
  const body = startPhoneCallBodyDtoSchema.parse({ phone, purpose })
  const raw = await getHttpClient().post<unknown>('/auth/phone/call', body, { auth: false })

  const parsed = phoneCallChallengeDtoSchema.safeParse(raw)
  if (!parsed.success) {
    throw parsed.error
  }

  return toPhoneCallChallenge(parsed.data)
}

/**
 * Опрос звонкового челленджа — `GET /auth/phone/call/:challengeId` (публичный).
 *
 * Всегда `200`: терминальные состояния (`expired`, `failed`) приходят полем `status`,
 * новых кодов ошибок контракт v1.2 не заводит.
 */
export async function getPhoneCallStatus (challengeId: string): Promise<PhoneCallResult> {
  const raw = await getHttpClient().get<unknown>(
    `/auth/phone/call/${encodeURIComponent(challengeId)}`,
    { auth: false },
  )

  const parsed = phoneCallStatusDtoSchema.safeParse(raw)
  if (!parsed.success) {
    throw parsed.error
  }

  return toPhoneCallResult(parsed.data)
}
