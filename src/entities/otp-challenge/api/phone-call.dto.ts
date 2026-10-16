import { z } from 'zod'
import { otpPurposeSchema } from '@/shared/model/otp'

/**
 * DTO звонкового канала (контракт v1.2, ADR-0014) — `POST /auth/phone/call`
 * и `GET /auth/phone/call/:challengeId`.
 *
 * Источник полей — бэкенд (`njs-server/src/modules/otp/interfaces/http/dto/phone-call-*`).
 */

/** Тело `POST /auth/phone/call`: как у `otp/send`, только без `channel`. */
export const startPhoneCallBodyDtoSchema = z.object({
  phone: z.string().regex(/^\+[1-9]\d{7,14}$/, 'phone must be E.164'),
  purpose: otpPurposeSchema,
})

export type StartPhoneCallBodyDto = z.infer<typeof startPhoneCallBodyDtoSchema>

/**
 * Ответ `POST /auth/phone/call`. `method: 'call'` — поле ответа бэкенда (в тексте
 * контракта не описано: контракт фиксирует пути, семантику и коды, а поля DTO живут
 * в спецификации). Окно на звонок — 5 минут, `otpFallback` разрешает запросить SMS
 * тем же номером.
 */
export const phoneCallChallengeDtoSchema = z.object({
  challengeId: z.string().min(1),
  channel: z.literal('phone'),
  method: z.literal('call'),
  callTo: z.string().min(1),
  expiresAt: z.coerce.date(),
  cooldownSeconds: z.number().int().nonnegative(),
  otpFallback: z.literal(true),
})

export type PhoneCallChallengeDto = z.infer<typeof phoneCallChallengeDtoSchema>

/**
 * Ответ `GET /auth/phone/call/:challengeId` — **всегда `200`**, терминальные
 * состояния выражены полем `status`, а не ошибкой.
 */
export const phoneCallStatusDtoSchema = z.object({
  challengeId: z.string().min(1),
  status: z.enum(['pending', 'verified', 'expired', 'failed']),
  verificationToken: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
})

export type PhoneCallStatusDto = z.infer<typeof phoneCallStatusDtoSchema>
