import { requestReauth, useAuthStore } from '@/entities/auth'
import {
  cancelContactChange,
  type ContactChannel,
  requestContactChange,
  useContactChangeStore,
  verifyContactChange,
} from '@/entities/contact-change'
import { useUserStore } from '@/entities/user'
import { ErrorCode, matchError, peekQueryClient } from '@/shared/api'

export interface RequestContactChangeFlowInput {
  /** Текущий пароль: из него бэкенд делает одноразовый `reauthToken`. */
  currentPassword: string
  channel: ContactChannel
  newValue: string
}

async function requestWith (reauthToken: string, input: RequestContactChangeFlowInput) {
  return requestContactChange(reauthToken, {
    channel: input.channel,
    newValue: input.newValue,
  })
}

/**
 * Начать смену контакта: `reauth` (подтверждение пароля) → `contact-change/request`.
 *
 * Два неочевидных места, оба из контракта:
 * 1. `422 ContactChangeAlreadyPending` **не** решается повтором: перевыпуск кода — это
 *    `cancel` → `request`. Поэтому держим `changeToken` активной смены в
 *    `useContactChangeStore`; без него (страница перезагружена) отменять нечего, и
 *    ошибка уходит пользователю как есть.
 * 2. `reauthToken` **одноразовый** (расходуется на первом `request`), поэтому после
 *    `cancel` пароль подтверждаем заново — иначе бэкенд ответит `401 ReauthTokenInvalid`.
 *    Пароль не кэшируем: он приходит аргументом и живёт в замыкании флоу.
 */
export async function requestContactChangeFlow (
  input: RequestContactChangeFlowInput,
): Promise<void> {
  const store = useContactChangeStore()

  try {
    const { reauthToken } = await requestReauth(input.currentPassword)
    store.startChallenge(await requestWith(reauthToken, input))
  } catch (error_) {
    const previousToken = store.changeToken
    if (!matchError(error_, ErrorCode.CONTACT_CHANGE_ALREADY_PENDING) || !previousToken) {
      throw error_
    }

    await cancelContactChange(previousToken)
    store.reset()

    const { reauthToken } = await requestReauth(input.currentPassword)
    store.startChallenge(await requestWith(reauthToken, input))
  }
}

/**
 * Подтвердить смену: `verify` применяет контакт и **отзывает доступ** (сессии Keycloak +
 * метка по `sub`), поэтому дальше нужен только вход заново.
 *
 * Успех: локальная сессия сбрасывается здесь же — иначе guard успел бы дёрнуть `/users/me`
 * уже отозванным токеном. `503` — «ничего не применено», `changeToken` жив: сессию не
 * трогаем, повтор безопасен (уважаем `Retry-After`). Ошибки не глотаем.
 */
export async function verifyContactChangeFlow (codes: {
  newCode: string
  oldCode?: string
}): Promise<void> {
  const store = useContactChangeStore()
  const changeToken = store.changeToken
  if (!changeToken) {
    throw new Error('Нет активной смены контакта')
  }

  await verifyContactChange({
    changeToken,
    newCode: codes.newCode,
    ...(codes.oldCode ? { oldCode: codes.oldCode } : {}),
  })

  store.reset()

  useAuthStore().clearTokens()
  useUserStore().reset()
  peekQueryClient()?.clear()
}

/**
 * Отменить активную смену. `422 ChangeTokenExpired` трактуем как «смены уже нет»:
 * для пользователя результат тот же — код можно запросить заново.
 */
export async function cancelContactChangeFlow (): Promise<void> {
  const store = useContactChangeStore()
  const changeToken = store.changeToken

  if (!changeToken) {
    store.reset()
    return
  }

  try {
    await cancelContactChange(changeToken)
  } catch (error_) {
    if (!matchError(error_, ErrorCode.CHANGE_TOKEN_EXPIRED)) {
      throw error_
    }
  }

  store.reset()
}
