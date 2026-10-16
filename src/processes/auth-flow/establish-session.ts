import { useAuthStore } from '@/entities/auth'
import { useUserStore } from '@/entities/user'
import { peekQueryClient } from '@/shared/api'
import { retryOn404 } from '@/shared/lib/async'

/**
 * Общий финал любого входа: сброс серверного кэша → загрузка профиля → компенсация
 * при отказе. Токены к этому моменту **уже в сторе**: `auth.login()` применяет их сам,
 * а флоу с готовой парой (phone sign-up/sign-in) зовёт `auth.applyTokenPair(pair)` до
 * вызова — так шаги «после токенов» живут в одном месте и не расходятся.
 *
 * Шаги:
 * 1. `queryClient.clear()` — данные предыдущего пользователя не должны пережить смену
 *    аккаунта (симметрично `logoutFlow`);
 * 2. `GET /users/me` с retry на 404 — гонка с `UserSignedInEvent` на бэкенде;
 * 3. компенсация: профиль не пришёл → откатываем сессию, чтобы пользователь не остался
 *    «залогинен без профиля».
 *
 * Navigation остаётся вызывающему коду (странице).
 */
export async function establishSession (): Promise<void> {
  const auth = useAuthStore()
  const user = useUserStore()

  peekQueryClient()?.clear()

  try {
    await retryOn404(() => user.fetchCurrentUser(), { attempts: 3, delay: 500 })
  } catch (error) {
    await auth.logout().catch(() => {})
    user.reset()
    throw error
  }
}
