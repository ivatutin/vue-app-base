import { useAuthStore } from '@/entities/auth'
import { useUserStore } from '@/entities/user'

/**
 * Полный logout-сценарий:
 * 1. auth.logout — sign-out на бэк (если есть refreshToken) +
 *    локальная очистка токенов. Сама по себе устойчива к сетевым
 *    ошибкам через try/finally в auth.store.
 * 2. user.reset — обнуление domain-state. Зовётся **гарантированно**
 *    через finally, даже если auth.logout пробросил.
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
  }
}
