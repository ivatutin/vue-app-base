import { useAuthStore } from '@/entities/auth'
import { useUserStore } from '@/entities/user'
import { peekQueryClient } from '@/shared/api'

/**
 * Полный logout-сценарий:
 * 1. auth.logout — sign-out на бэк (если есть refreshToken) +
 *    локальная очистка токенов. Сама по себе устойчива к сетевым
 *    ошибкам через try/finally в auth.store.
 * 2. user.reset + очистка кэша TanStack Query — обнуление всех следов
 *    сессии. Зовётся **гарантированно** через finally, даже если
 *    auth.logout пробросил.
 *
 * Navigation остаётся caller'у. LogoutPage показывает «Вы вышли» в
 * шаблоне; setup-http-client при refresh-fail полагается на router-
 * guard, который при следующем переходе увидит !isAuthorized и
 * редиректнет на /auth/login.
 */
export async function logoutFlow (): Promise<void> {
  try {
    await useAuthStore().logout()
  } finally {
    useUserStore().reset()
    clearServerCache()
  }
}

/**
 * Без этого данные предыдущего пользователя переживают смену аккаунта:
 * ключ `['users','me']` остаётся в кэше, и следующий вошедший в той же
 * вкладке видит чужой профиль в течение `staleTime` (30 с), пока идёт
 * фоновый refetch. С ростом числа queries это становится системным.
 *
 * `clear()`, а не точечный `removeQueries`: при смене аккаунта
 * недействителен **весь** серверный state, а не отдельный ключ.
 */
function clearServerCache (): void {
  // peek, а не get: отсутствие Query-провайдера (тесты, окружения без
  // него) не должно мешать пользователю выйти из аккаунта.
  peekQueryClient()?.clear()
}
