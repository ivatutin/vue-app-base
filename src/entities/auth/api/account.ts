import { getHttpClient } from '@/shared/api'
import {
  changePasswordBodyDtoSchema,
  reauthBodyDtoSchema,
  reauthResponseDtoSchema,
  setPasswordBodyDtoSchema,
} from './account.dto'

export interface ReauthChallenge {
  reauthToken: string
  /** ISO-строка; токен одноразовый и живёт ~5 минут. */
  expiresAt: string
}

/**
 * `POST /auth/reauth` — подтверждение пароля перед чувствительной операцией.
 *
 * Возвращает одноразовый токен: он живёт ~5 минут, расходуется на первой операции и
 * **не является входом** (сессию не продлевает, пару токенов не выдаёт). Дольше одной
 * операции он не нужен, поэтому в сторе не живёт — только в замыкании флоу.
 */
export async function requestReauth (password: string): Promise<ReauthChallenge> {
  const body = reauthBodyDtoSchema.parse({ password })
  const raw = await getHttpClient().post<unknown>('/auth/reauth', body)

  const parsed = reauthResponseDtoSchema.safeParse(raw)
  if (!parsed.success) {
    throw parsed.error
  }

  return parsed.data
}

/**
 * `POST /users/me/password` — смена пароля для владельца сессии.
 *
 * Требует `X-Reauth-Token` от {@link requestReauth}: без него `401 ReauthTokenInvalid`,
 * с просроченным — `422 ReauthTokenExpired`. Ответ — `204`, тела нет.
 */
export async function changePassword (reauthToken: string, newPassword: string): Promise<void> {
  const body = changePasswordBodyDtoSchema.parse({ newPassword })
  await getHttpClient().post<void>('/users/me/password', body, {
    headers: { 'X-Reauth-Token': reauthToken },
  })
}

/**
 * `POST /users/me/set-password` — задать пароль аккаунту без пароля (phone sign-up).
 *
 * Нужен `verificationToken` с `purpose: 'set-password'` для **собственного** контакта
 * пользователя: чужой токен бэкенд отвергает. Ответ — `204`.
 */
export async function setPassword (
  verificationToken: string,
  newPassword: string,
): Promise<void> {
  const body = setPasswordBodyDtoSchema.parse({ verificationToken, newPassword })
  await getHttpClient().post<void>('/users/me/set-password', body)
}

/**
 * `POST /users/me/logout-all` — отозвать все refresh-токены пользователя (все устройства).
 *
 * Идемпотентен; `X-Reauth-Token` не нужен (операция не может захватить аккаунт).
 * `503` означает, что не отозвано **ничего** — сессию в этом случае не трогаем.
 */
export async function logoutAll (): Promise<void> {
  await getHttpClient().post<void>('/users/me/logout-all')
}
