import { getHttpClient } from '@/shared/api'
import {
  cancelContactChangeBodyDtoSchema,
  type ContactChannel,
  requestContactChangeBodyDtoSchema,
  type RequestContactChangeResponseDto,
  requestContactChangeResponseDtoSchema,
  verifyContactChangeBodyDtoSchema,
} from './contact-change.dto'

export type { ContactChannel } from './contact-change.dto'

export interface RequestContactChangeInput {
  channel: ContactChannel
  /** Новое значение: email (нормализуется бэкендом в lowercase) или телефон (E.164). */
  newValue: string
}

export interface ContactChangeChallenge extends RequestContactChangeResponseDto {
  channel: ContactChannel
  newValue: string
}

/**
 * `POST /users/me/contact-change/request` — начало смены контакта.
 *
 * Требует `X-Reauth-Token` (одноразовый, из `POST /auth/reauth`). Код приходит на **новое**
 * значение, а при `requiresOldChallenge` — ещё и на старое. Повторный `request` при
 * активной смене отвечает `422 ContactChangeAlreadyPending`: перевыпуск кода делается
 * только через `cancel` → `request` (см. `requestContactChangeFlow`).
 */
export async function requestContactChange (
  reauthToken: string,
  input: RequestContactChangeInput,
): Promise<ContactChangeChallenge> {
  const body = requestContactChangeBodyDtoSchema.parse(input)
  const raw = await getHttpClient().post<unknown>('/users/me/contact-change/request', body, {
    headers: { 'X-Reauth-Token': reauthToken },
  })

  const parsed = requestContactChangeResponseDtoSchema.safeParse(raw)
  if (!parsed.success) {
    throw parsed.error
  }

  return { ...parsed.data, channel: body.channel, newValue: body.newValue }
}

export interface VerifyContactChangeInput {
  changeToken: string
  newCode: string
  /** Только когда `request` вернул `requiresOldChallenge: true`. */
  oldCode?: string
}

/**
 * `POST /users/me/contact-change/verify` — применить смену.
 *
 * **Успех (`200`) отзывает доступ**: бэкенд гасит сессии Keycloak и ставит метку по `sub`,
 * поэтому следующий запрос получит `401`. Тело (`UserDto`) намеренно не разбираем и не
 * применяем: профиль неактуален до повторного входа.
 *
 * `503` означает, что **ничего не применено**, а `changeToken` жив: повтор безопасен.
 */
export async function verifyContactChange (input: VerifyContactChangeInput): Promise<void> {
  const body = verifyContactChangeBodyDtoSchema.parse(input)
  await getHttpClient().post<void>('/users/me/contact-change/verify', body)
}

/**
 * `POST /users/me/contact-change/cancel` — освободить активную смену (`204`).
 *
 * Нужен ровно для одного: разрешить новый `request` после `ContactChangeAlreadyPending`.
 */
export async function cancelContactChange (changeToken: string): Promise<void> {
  const body = cancelContactChangeBodyDtoSchema.parse({ changeToken })
  await getHttpClient().post<void>('/users/me/contact-change/cancel', body)
}
