import { useAuthStore } from '@/entities/auth'
import { establishSession } from './establish-session'

/**
 * Оркестрация login-сценария по email/паролю:
 * 1. `auth.login` — получение и сохранение пары токенов (компенсации внутри нет);
 * 2. `establishSession` — сброс серверного кэша предыдущей сессии, загрузка профиля
 *    через `GET /users/me` (с retry на 404) и откат сессии, если профиль не пришёл.
 *
 * Navigation остаётся ответственностью caller'а (LoginPage сам решает, куда редиректить).
 */
export async function loginFlow (email: string, password: string): Promise<void> {
  await useAuthStore().login(email, password)
  await establishSession()
}
