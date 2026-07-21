import type { App } from 'vue'
import type { Router } from 'vue-router'
import { setupLayouts } from 'virtual:generated-layouts'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { useUserStore } from '@/entities/user'
import { resolveGuard } from './resolve-guard'

export interface SetupRouterOptions {
  /**
   * Guard дожидается восстановления сессии перед первым решением.
   * Внедряется, а не импортируется, чтобы окружения без bootstrap
   * (тесты, Storybook) не зависли на вечно ожидающем промисе.
   */
  waitForSession?: () => Promise<void>
}

export function setupRouter (app: App, options: SetupRouterOptions = {}): Router {
  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: setupLayouts(routes),
  })

  // Workaround for https://github.com/vitejs/vite/issues/11804:
  // после деплоя старый чанк исчезает, lazy-import маршрута падает.
  // Перезагружаем страницу один раз; флаг в localStorage не даёт
  // зациклиться, если перезагрузка не помогла.
  const RELOAD_FLAG = 'app:dynamic-reload'

  router.onError((error, to) => {
    if (!error?.message?.includes?.('Failed to fetch dynamically imported module')) {
      console.error(error)
      return
    }

    if (localStorage.getItem(RELOAD_FLAG)) {
      console.error('Dynamic import error, reloading page did not fix it', error)
      return
    }

    localStorage.setItem(RELOAD_FLAG, 'true')
    location.assign(to.fullPath)
  })

  router.beforeEach(async to => {
    // Первая навигация стартует синхронно внутри `app.use(router)` —
    // раньше, чем bootstrap успевает прочитать токены и загрузить
    // профиль. Без этого ожидания guard судит по пустому стору и
    // отправляет залогиненного пользователя на login при каждом F5.
    await options.waitForSession?.()

    const userStore = useUserStore()
    const { isAuthenticated, isAuthorized } = storeToRefs(userStore)

    const target = resolveGuard({
      requiresAuth: !to.meta.noAuth,
      isAuthenticated: isAuthenticated.value,
      isAuthorized: isAuthorized.value,
      requiredPermissions: to.meta.permissions ?? [],
      hasPermission: p => userStore.hasPermission(p),
    })

    // Разворачиваем union в литералы: типизированный роутер принимает
    // только конкретное имя, а заодно проверяет, что все три маршрута
    // действительно существуют — опечатка в resolve-guard не соберётся.
    switch (target) {
      case '/auth/login': {
        return { name: '/auth/login' }
      }
      case '/system/account-status': {
        return { name: '/system/account-status' }
      }
      case '/system/forbidden': {
        return { name: '/system/forbidden' }
      }
      default: {
        return undefined
      }
    }
  })

  // Навигация состоялась — значит чанки грузятся, флаг перезагрузки
  // можно снять. `catch` обязателен: isReady() реджектится, если
  // первая навигация упала, и без него это unhandled rejection.
  void router
    .isReady()
    .then(() => localStorage.removeItem(RELOAD_FLAG))
    .catch(() => {})

  app.use(router)

  return router
}
