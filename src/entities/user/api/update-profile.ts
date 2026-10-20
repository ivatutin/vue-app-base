import type { User } from '../schema/user.schema'
import { getHttpClient } from '@/shared/api'
import { updateProfileBodyDtoSchema, userDtoSchema } from './user.dto'
import { toUser } from './user.mapper'

/** Тело `PATCH /users/me/profile`: хотя бы одно поле; `null` очищает значение. */
export interface UpdateProfileInput {
  firstName?: string | null
  lastName?: string | null
}

/**
 * `PATCH /users/me/profile` — имя и фамилия **своего** профиля (контракт v1.6, 20.10.2026).
 *
 * Эндпоинт protected, без `@Roles`: бэкенд пишет в Keycloak (источник истины по имени) **и** в
 * shadow-БД, поэтому значение переживает синхронизацию на следующем входе. Требует хотя бы одно
 * поле, `null` очищает. Ответ — полный `UserDto`, применяем его тем же mapper'ом, что и
 * `GET /users/me` (роли/статус в ответе актуальны).
 *
 * Админский `PATCH /users/:id/profile` остаётся на бэкенде, но фронту не нужен: здесь все
 * действия — про собственный профиль.
 */
export async function updateUserProfile (input: UpdateProfileInput): Promise<User> {
  const body = updateProfileBodyDtoSchema.parse(input)
  const raw = await getHttpClient().patch<unknown>('/users/me/profile', body)

  const parsed = userDtoSchema.safeParse(raw)
  if (!parsed.success) {
    throw parsed.error
  }

  return toUser(parsed.data)
}
