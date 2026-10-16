import { z } from 'zod'
import { emailSchema, passwordSchema } from '@/shared/model/credentials'
import { phoneSchema } from '@/shared/model/phone'

export const tokenPairDtoSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresIn: z.number().int().positive(),
})

export type TokenPairDto = z.infer<typeof tokenPairDtoSchema>

/**
 * Тело `POST /auth/sign-up/email` (контракт Auth v1). Email и пароль — уже
 * нормализованные значения из `shared/model/credentials`; `acceptedTerms`
 * обязателен: без него бэкенд отвечает `422 TermsNotAccepted`.
 */
export const signUpEmailBodyDtoSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  acceptedTerms: z.literal(true),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
})

export type SignUpEmailBodyDto = z.infer<typeof signUpEmailBodyDtoSchema>

/**
 * Ответ `POST /auth/sign-up/email`: **пары токенов нет** — вход выполняется после
 * подтверждения адреса (вариант A). `user` приходит полностью, но здесь
 * намеренно не валидируется: это `UserDto` соседнего слайса, а на этом шаге нужен
 * только признак отправки письма (`verifyEmailSent` может быть и `false` —
 * отправка письма не валит регистрацию).
 */
export const signUpEmailResponseDtoSchema = z.object({
  verifyEmailSent: z.boolean(),
})

export type SignUpEmailResponseDto = z.infer<typeof signUpEmailResponseDtoSchema>

/** Тело `POST /auth/verify-email/resend`. Ответ всегда `202` (anti-enumeration). */
export const resendVerifyEmailBodyDtoSchema = z.object({
  email: emailSchema,
})

export type ResendVerifyEmailBodyDto = z.infer<typeof resendVerifyEmailBodyDtoSchema>

/**
 * Тело `POST /auth/forgot-password`. Ответ **всегда** `202` (anti-enumeration:
 * не выдаёт, зарегистрирован ли адрес). Новый пароль задаётся на странице
 * Keycloak — required action `UPDATE_PASSWORD`.
 */
export const forgotPasswordBodyDtoSchema = z.object({
  email: emailSchema,
})

export type ForgotPasswordBodyDto = z.infer<typeof forgotPasswordBodyDtoSchema>

/**
 * Тело `POST /auth/sign-up/phone` (Phase 2). `acceptedTerms` — **boolean** (как на
 * бэкенде): отказ от условий должен давать доменный `TermsNotAccepted`, а не ошибку
 * валидации. `verificationToken` — из OTP-канала (`purpose: 'sign-up'`).
 */
export const signUpPhoneBodyDtoSchema = z.object({
  phone: phoneSchema,
  verificationToken: z.string().min(1),
  acceptedTerms: z.boolean(),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
})

export type SignUpPhoneBodyDto = z.infer<typeof signUpPhoneBodyDtoSchema>

/**
 * Ответ `POST /auth/sign-up/phone`: `{ user, tokens }`. `user` намеренно не валидируем —
 * профиль всё равно придёт из `GET /users/me` (это `UserDto` соседнего слайса).
 */
export const signUpPhoneResponseDtoSchema = z.object({
  tokens: tokenPairDtoSchema,
})

export type SignUpPhoneResponseDto = z.infer<typeof signUpPhoneResponseDtoSchema>

/** Тело `POST /auth/sign-in/phone`: `verificationToken` с `purpose: 'sign-in'`. */
export const signInPhoneBodyDtoSchema = z.object({
  phone: phoneSchema,
  verificationToken: z.string().min(1),
})

export type SignInPhoneBodyDto = z.infer<typeof signInPhoneBodyDtoSchema>
