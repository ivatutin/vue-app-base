import { z } from 'zod'
import { passwordSchema } from '@/shared/model/credentials'

/**
 * `POST /auth/reauth` — подтверждение пароля. Бэкенд валидирует только непустоту:
 * сложность здесь не проверяется (пароль уже существует), поэтому `min(1)`.
 */
export const reauthBodyDtoSchema = z.object({
  password: z.string().min(1),
})

/** Ответ `POST /auth/reauth`: одноразовый токен на ~5 минут. */
export const reauthResponseDtoSchema = z.object({
  reauthToken: z.string().min(1),
  /** ISO-строка. */
  expiresAt: z.string(),
})

/** `POST /users/me/password` — новый пароль (сложность по политике realm). */
export const changePasswordBodyDtoSchema = z.object({
  newPassword: passwordSchema,
})

/** `POST /users/me/set-password` — задать пароль passwordless-аккаунту. */
export const setPasswordBodyDtoSchema = z.object({
  verificationToken: z.string().min(1),
  newPassword: passwordSchema,
})
