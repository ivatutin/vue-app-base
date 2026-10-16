import type { Email, Password } from '@/shared/model/credentials'
import type { Phone } from '@/shared/model/phone'
import { getHttpClient, HttpError } from '@/shared/api'
import {
  forgotPasswordBodyDtoSchema,
  resendVerifyEmailBodyDtoSchema,
  signInPhoneBodyDtoSchema,
  signUpEmailBodyDtoSchema,
  signUpEmailResponseDtoSchema,
  signUpPhoneBodyDtoSchema,
  signUpPhoneResponseDtoSchema,
  type TokenPairDto,
  tokenPairDtoSchema,
} from './auth.dto'

export type TokenPair = TokenPairDto

export interface SignUpEmailInput {
  email: Email
  password: Password
  /** Форма обязана гарантировать `true` (чекбокс «принимаю условия»). */
  acceptedTerms: true
  firstName?: string
  lastName?: string
}

/**
 * Регистрация по email (`POST /auth/sign-up/email`, публичный).
 *
 * Возвращает только признак отправки письма: пары токенов в ответе нет — вход
 * выполняется после подтверждения адреса (вариант A, 16.10.2026).
 */
export async function signUpEmail (input: SignUpEmailInput): Promise<boolean> {
  const body = signUpEmailBodyDtoSchema.parse(input)
  const raw = await getHttpClient().post<unknown>('/auth/sign-up/email', body, { auth: false })

  const parsed = signUpEmailResponseDtoSchema.safeParse(raw)
  if (!parsed.success) {
    throw parsed.error
  }

  return parsed.data.verifyEmailSent
}

/**
 * Повторная отправка письма-подтверждения (`POST /auth/verify-email/resend`).
 *
 * Ответ всегда `202` (anti-enumeration: не выдаёт, существует ли адрес), поэтому
 * наружу ничего не возвращается — успех выражается отсутствием ошибки.
 */
export async function resendVerifyEmail (email: Email): Promise<void> {
  const body = resendVerifyEmailBodyDtoSchema.parse({ email })
  await getHttpClient().post<void>('/auth/verify-email/resend', body, { auth: false })
}

export interface SignUpPhoneInput {
  phone: Phone
  verificationToken: string
  /** Форма гарантирует согласие; `false` бэкенд отвергает кодом `TermsNotAccepted`. */
  acceptedTerms: boolean
  firstName?: string
  lastName?: string
}

/**
 * Регистрация по телефону (`POST /auth/sign-up/phone`, публичный) — Phase 2.
 *
 * `verificationToken` приходит из OTP-канала с `purpose: 'sign-up'` (или из звонкового
 * канала — токен общий). Отдаём пару токенов: `user` из ответа не валидируем, профиль
 * подтянет общий финал входа (`GET /users/me`).
 */
export async function signUpPhone (input: SignUpPhoneInput): Promise<TokenPair> {
  const body = signUpPhoneBodyDtoSchema.parse(input)
  const raw = await getHttpClient().post<unknown>('/auth/sign-up/phone', body, { auth: false })

  const parsed = signUpPhoneResponseDtoSchema.safeParse(raw)
  if (!parsed.success) {
    throw parsed.error
  }

  return parsed.data.tokens
}

/**
 * Вход по телефону (`POST /auth/sign-in/phone`, публичный): `verificationToken`
 * с `purpose: 'sign-in'`. Ответ — плоская пара токенов.
 */
export async function signInPhone (phone: Phone, verificationToken: string): Promise<TokenPair> {
  const body = signInPhoneBodyDtoSchema.parse({ phone, verificationToken })
  const raw = await getHttpClient().post<unknown>('/auth/sign-in/phone', body, { auth: false })

  const parsed = tokenPairDtoSchema.safeParse(raw)
  if (!parsed.success) {
    throw parsed.error
  }

  return parsed.data
}

/**
 * Запрос письма для сброса пароля (`POST /auth/forgot-password`, публичный).
 *
 * Бэкенд отвечает `202` **всегда** (anti-enumeration), поэтому наружу ничего не
 * возвращаем: успех выражается отсутствием ошибки (сеть, 5xx). Новый пароль
 * пользователь задаёт на странице Keycloak (required action `UPDATE_PASSWORD`) —
 * своей формы нового пароля у нас нет.
 */
export async function forgotPassword (email: Email): Promise<void> {
  const body = forgotPasswordBodyDtoSchema.parse({ email })
  await getHttpClient().post<void>('/auth/forgot-password', body, { auth: false })
}

export async function signIn (email: string, password: string): Promise<TokenPair> {
  const client = getHttpClient()
  const raw = await client.post<unknown>(
    '/auth/sign-in',
    { email, password },
    { auth: false },
  )
  return parse(raw)
}

export async function refreshTokens (refreshToken: string): Promise<TokenPair> {
  const client = getHttpClient()
  const raw = await client.post<unknown>(
    '/auth/refresh',
    { refreshToken },
    { auth: false },
  )
  return parse(raw)
}

export async function signOut (refreshToken: string): Promise<void> {
  const client = getHttpClient()
  try {
    await client.post<void>('/auth/sign-out', { refreshToken })
  } catch (error) {
    // 401 при истёкшем access — нормально, локальную сессию всё равно
    // очищаем; всё, кроме 401, пробрасываем наверх.
    if (!(error instanceof HttpError) || error.status !== 401) {
      throw error
    }
  }
}

function parse (raw: unknown): TokenPair {
  const result = tokenPairDtoSchema.safeParse(raw)
  if (!result.success) {
    throw result.error
  }
  return result.data
}
