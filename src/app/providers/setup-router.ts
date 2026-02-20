import { setupLayouts } from 'virtual:generated-layouts'
import type { App } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import type { Router } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
import { useUserStore } from '@/entities/user'

export function setupRouter(app: App): Router {

    console.log('import.meta', import.meta)

    const router = createRouter({
        history: createWebHistory(import.meta.env.BASE_URL),
        routes: setupLayouts(routes),
    })

    const { user, isAuthorized } = useUserStore()

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

    router.beforeEach((to, from) => {
        if (!to.meta.noAuth && !isAuthorized.value) {
            return { name: '/auth/login' }
        }
    })

    router.isReady().then(() => {
        localStorage.removeItem('vuetify:dynamic-reload')
    })

    app.use(router)

    return router
}