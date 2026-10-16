import { z } from 'zod'
import { otpPurposeSchema } from '@/shared/model/otp'

/**
 * DTO-схемы `POST /auth/otp/send|verify` — контракт Auth v1.0.
 *
 * Источник полей — бэкенд (`njs-server/src/modules/otp/interfaces/http/dto/`):
 * живые формы важнее Swagger'а (в документации стенда DTO-схемы пока без
 * свойств) и описания в `docs/integration-backend.md`.
 */

/** `channel` публичного OTP-API — всегда телефон: email идёт через Keycloak. */
export const otpChannelDtoSchema = z.literal('phone')

/** Тело `POST /auth/otp/send`: телефон обязан быть в E.164 (`+[1-9]\d{7,14}`). */
export const sendOtpBodyDtoSchema = z.object({
  channel: otpChannelDtoSchema,
  target: z.string().regex(/^\+[1-9]\d{7,14}$/, 'phone must be E.164'),
  purpose: otpPurposeSchema,
})

export type SendOtpBodyDto = z.infer<typeof sendOtpBodyDtoSchema>

/** Ответ `POST /auth/otp/send`: `target` замаскирован, `codeLength` — 6. */
export const otpChallengeDtoSchema = z.object({
  challengeId: z.string().min(1),
  channel: otpChannelDtoSchema,
  target: z.string().min(1),
  expiresAt: z.coerce.date(),
  cooldownSeconds: z.number().int().nonnegative(),
  codeLength: z.number().int().positive(),
})

export type OtpChallengeDto = z.infer<typeof otpChallengeDtoSchema>

/** Тело `POST /auth/otp/verify`: ровно 6 цифр (`OTP_CODE_LENGTH`). */
export const verifyOtpBodyDtoSchema = z.object({
  challengeId: z.string().min(1),
  code: z.string().regex(/^\d{6}$/, 'code must be 6 digits'),
})

export type VerifyOtpBodyDto = z.infer<typeof verifyOtpBodyDtoSchema>

/** Ответ `POST /auth/otp/verify`: одноразовый `verificationToken` (10 минут). */
export const otpVerifiedDtoSchema = z.object({
  challengeId: z.string().min(1),
  verified: z.literal(true),
  verificationToken: z.string().min(1),
})

export type OtpVerifiedDto = z.infer<typeof otpVerifiedDtoSchema>
