import type { App } from 'vue'
import { setupErrorHandler } from './setup-error-handler'
import { setupHttpClient } from './setup-http-client'
import { setupPinia } from './setup-pinia'
import { setupRouter } from './setup-router'
import { setupTheme } from './setup-theme'

/**
 * setupVuetify больше не вызывается — Фаза 2.8 убрала Vuetify из shell
 * и обёрток. Файлы setup-vuetify.ts + vuetify-theme.ts остаются
 * orphan'ами до Фазы 2.9 (удаление npm-пакетов), tree-shake уберёт
 * их из production bundle.
 */
export function setupProviders (app: App) {
  const pinia = setupPinia(app)
  const httpClient = setupHttpClient(app)
  setupErrorHandler(app)
  setupTheme(app)
  const router = setupRouter(app)

  return {
    pinia,
    httpClient,
    router,
  }
}
