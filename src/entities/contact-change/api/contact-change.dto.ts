import { z } from 'zod'

/**
 * DTO смены контакта (контракт v1.3, Phase 4).
 *
 * Схемы — зеркало бэкенда (`request-contact-change.dto.ts`,
 * `verify-contact-change.dto.ts`, `cancel-contact-change.dto.ts`): те же имена полей и
 * те же ограничения, чтобы расхождение ловилось zod'ом на клиенте, а не 400-й с сервера.
 */

export const contactChannelSchema = z.enum(['email', 'phone'])

export type ContactChannel = z.infer<typeof contactChannelSchema>

/** `POST /users/me/contact-change/request`: код уйдёт на новое значение. */
export const requestContactChangeBodyDtoSchema = z.object({
  channel: contactChannelSchema,
  newValue: z.string().trim().min(3),
})

export type RequestContactChangeBodyDto = z.infer<typeof requestContactChangeBodyDtoSchema>

/** Ответ `201`: `changeToken` живёт 15 мин, `oldChallengeId` — только при `requiresOldChallenge`. */
export const requestContactChangeResponseDtoSchema = z.object({
  changeToken: z.string().min(1),
  requiresOldChallenge: z.boolean(),
  oldChallengeId: z.string().nullable(),
  newChallengeId: z.string().min(1),
})

export type RequestContactChangeResponseDto = z.infer<typeof requestContactChangeResponseDtoSchema>

/** `POST /users/me/contact-change/verify`: `oldCode` обязателен, если его требует `request`. */
export const verifyContactChangeBodyDtoSchema = z.object({
  changeToken: z.string().min(1),
  newCode: z.string().min(1),
  oldCode: z.string().min(1).optional(),
})

export type VerifyContactChangeBodyDto = z.infer<typeof verifyContactChangeBodyDtoSchema>

/** `POST /users/me/contact-change/cancel`. */
export const cancelContactChangeBodyDtoSchema = z.object({
  changeToken: z.string().min(1),
})
