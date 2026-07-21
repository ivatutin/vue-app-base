import { useAuthStore } from '@/entities/auth'
import { useUserStore } from '@/entities/user'
import { peekQueryClient } from '@/shared/api'
import { retryOn404 } from '@/shared/lib/async'

/**
 * Оркестрация полного login-сценария:
 * 1. auth.login → получение и сохранение пары токенов.
 * 2. user.fetchCurrentUser → подгрузка профиля через GET /users/me
 *    с retry на 404 (гонка с UserSignedInEvent на njs-server,
 *    см. docs/integration-backend.md § Особенности интеграции).
 *
 * Если второй шаг провалится — auth-state откатывается (compensating
 * transaction), чтобы пользователь не остался «залогинен без профиля».
 *
 * Navigation остаётся ответственностью caller'а (LoginPage сам решает,
 * куда редиректить — на /dashboard, на return-url из meta и т.п.).
 */
export async function loginFlow (email: string, password: string): Promise<void> {
  const auth = useAuthStore()
  const user = useUserStore()

  await auth.login(email, password)

  // Симметрично logoutFlow: сессия могла закончиться и без явного
  // выхода (протухший refresh), тогда кэш предыдущего пользователя
  // остался. Чистим сразу после логина — до того, как queries
  // среагируют на ставший активным `isSessionActive`.
  peekQueryClient()?.clear()

  try {
    await retryOn404(() => user.fetchCurrentUser(), { attempts: 3, delay: 500 })
  } catch (error) {
    // Компенсация: токены сохранены, но профиль не подгрузился —
    // откатываем сессию. Saw-out на бэке может тоже упасть, но
    // локальная очистка в auth.logout срабатывает в любом случае.
    await auth.logout().catch(() => {})
    user.reset()
    throw error
  }
}
