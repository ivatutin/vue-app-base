import { z } from 'zod'

/**
 * Активный челлендж подтверждения телефона — домен (camelCase), см.
 * [ADR-0011](../../../../docs/adr/0011-otp-verification-model.md).
 *
 * `target` приходит с бэкенда **замаскированным** (`+7 (***) ***-12-34`) —
 * полный номер в UI не нужен и в состоянии не хранится.
 */
export const otpChallengeSchema = z.object({
  challengeId: z.string().min(1),
  channel: z.literal('phone'),
  target: z.string().min(1),
  expiresAt: z.date(),
  cooldownSeconds: z.number().int().nonnegative(),
  codeLength: z.number().int().positive(),
})

export type OtpChallenge = z.infer<typeof otpChallengeSchema>

/**
 * Результат успешной проверки кода: одноразовый `verificationToken`
 * (TTL 10 минут), который предъявляется в `sign-up/phone`, `sign-in/phone`
 * или `set-password`.
 *
 * В сторе **не сохраняется** — живёт в памяти процесса флоу, чтобы не переживать
 * перезагрузку и не попадать в storage (ADR-0011 § Anti-patterns).
 */
export const otpVerificationSchema = z.object({
  challengeId: z.string().min(1),
  verificationToken: z.string().min(1),
})

export type OtpVerification = z.infer<typeof otpVerificationSchema>

/**
 * Звонковый челлендж (контракт v1.2, ADR-0014) — второй канал подтверждения телефона.
 * `callTo` — **общий** сервисный номер провайдера: привязка звонка идёт по номеру звонящего,
 * поэтому UI обязан явно попросить «звоните с этого же номера».
 */
export const phoneCallChallengeSchema = z.object({
  challengeId: z.string().min(1),
  callTo: z.string().min(1),
  expiresAt: z.date(),
  cooldownSeconds: z.number().int().nonnegative(),
})

export type PhoneCallChallenge = z.infer<typeof phoneCallChallengeSchema>

/**
 * Терминальные состояния звонка. Приходят **полем `status` при HTTP 200** —
 * контракт v1.2 намеренно не заводит для них новых кодов ошибок.
 */
export const phoneCallStatusSchema = z.enum(['pending', 'verified', 'expired', 'failed'])

export type PhoneCallStatus = z.infer<typeof phoneCallStatusSchema>

/**
 * Результат опроса `GET /auth/phone/call/:challengeId`. `verificationToken` приходит
 * только при `verified`, `reason` — только при `failed`.
 */
export const phoneCallResultSchema = z.object({
  challengeId: z.string().min(1),
  status: phoneCallStatusSchema,
  verificationToken: z.string().min(1).nullable(),
  reason: z.string().nullable(),
})

export type PhoneCallResult = z.infer<typeof phoneCallResultSchema>
