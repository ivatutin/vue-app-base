import { z } from 'zod'

/**
 * Сценарии, для которых выдаётся OTP. Список заморожен контрактом Auth v1 и
 * дословно совпадает с `OTP_PURPOSES` на бэкенде (`otp-policy.ts:18-25`).
 * Расширение — только через координатора контракта.
 */
export const otpPurposeSchema = z.enum([
  'sign-up',
  'sign-in',
  'verify-contact',
  'change-contact-old',
  'change-contact-new',
  'set-password',
])

export type OtpPurpose = z.infer<typeof otpPurposeSchema>

/**
 * Способ подтверждения телефона (ADR-0011 + ADR-0014): `otp` — код из SMS,
 * `call` — обратный звонок с последующим опросом статуса.
 *
 * Словарь **внутренний** и на провод не выводится: канал различается
 * эндпоинтом (`/auth/otp/*` против `/auth/phone/call`). Значения совпадают с
 * `VERIFICATION_METHODS` бэкенда (`otp-policy.ts:60`).
 */
export const otpDeliverySchema = z.enum(['otp', 'call'])

export type OtpDelivery = z.infer<typeof otpDeliverySchema>
