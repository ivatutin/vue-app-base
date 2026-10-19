import type { User } from '../schema/user.schema'
import { getHttpClient } from '@/shared/api'
import { updateProfileBodyDtoSchema, userDtoSchema } from './user.dto'
import { toUser } from './user.mapper'

/** Тело `PATCH /users/:id/profile`: хотя бы одно поле; `null` очищает значение. */
export interface UpdateProfileInput {
  firstName?: string | null
  lastName?: string | null
}

/**
 * `PATCH /users/:id/profile` — имя и фамилия пользователя.
 *
 * Бэкенд требует хотя бы одно поле и принимает `null` для очистки; ответ — полный
 * `UserDto`, поэтому применяем его тем же mapper'ом, что и `GET /users/me`
 * (не собираем профиль по кускам: `roles`/`status` в запросе не участвуют, но
 * в ответе приходят актуальными).
 */
export async function updateUserProfile (
  userId: string,
  input: UpdateProfileInput,
): Promise<User> {
  const body = updateProfileBodyDtoSchema.parse(input)
  const raw = await getHttpClient().patch<unknown>(
    `/users/${encodeURIComponent(userId)}/profile`,
    body,
  )

  const parsed = userDtoSchema.safeParse(raw)
  if (!parsed.success) {
    throw parsed.error
  }

  return toUser(parsed.data)
}
