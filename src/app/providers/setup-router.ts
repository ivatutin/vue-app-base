import type { App } from 'vue'
import type { Router } from 'vue-router'
import { setupLayouts } from 'virtual:generated-layouts'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { useUserStore } from '@/entities/user'

export function setupRouter (app: App): Router {
  const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: setupLayouts(routes),
  })

  // Workaround for https://github.com/vitejs/vite/issues/11804
  router.onError((err, to) => {
    if (err?.message?.includes?.('Failed to fetch dynamically imported module')) {
      if (localStorage.getItem('vuetify:dynamic-reload')) {
        console.error('Dynamic import error, reloading page did not fix it', err)
      } else {
        console.log('Reloading page to fix dynamic import error')
        localStorage.setItem('vuetify:dynamic-reload', 'true')
        location.assign(to.fullPath)
      }
    } else {
      console.error(err)
    }
  })

  router.beforeEach(to => {
    const userStore = useUserStore()
    const { isAuthorized } = storeToRefs(userStore)

    if (!to.meta.noAuth && !isAuthorized.value) {
      return { name: '/auth/login' }
    }

    const required = to.meta.permissions
    if (required?.length) {
      const ok = required.every(p => userStore.hasPermission(p))
      if (!ok) {
        return { name: '/system/forbidden' }
      }
    }
  })

  router.isReady().then(() => {
    localStorage.removeItem('vuetify:dynamic-reload')
  })

  app.use(router)

  return router
}
