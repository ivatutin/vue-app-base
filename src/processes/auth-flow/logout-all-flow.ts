import { logoutAll, useAuthStore } from '@/entities/auth'
import { useUserStore } from '@/entities/user'
import { peekQueryClient } from '@/shared/api'

/**
 * «Выйти на всех устройствах» (v1.4, `POST /users/me/logout-all`).
 *
 * Порядок намеренно такой:
 * 1. **Сначала серверный отзыв.** `503` означает, что бэкенд не отозвал **ничего**
 *    (`{ logoutAll: config }` в `handover/logout-all-frontend.md`): в этом случае
 *    сессию не трогаем и пробрасываем ошибку — иначе пользователь решит, что вышел,
 *    а refresh-токены останутся живы на других устройствах.
 * 2. **Потом локальный сброс** — токены, профиль, серверный кэш. `X-Reauth-Token`
 *    здесь не нужен: операция не может захватить аккаунт.
 *
 * Сброс идёт **до** навигации: иначе guard успел бы дёрнуть `/users/me` уже
 * отозванным access-токеном и получить `401` в ответ на собственный выход.
 * Навигацию оставляем вызывающему коду (страница уводит на `/auth/login`).
 */
export async function logoutAllFlow (): Promise<void> {
  await logoutAll()

  useAuthStore().clearTokens()
  useUserStore().reset()
  peekQueryClient()?.clear()
}
