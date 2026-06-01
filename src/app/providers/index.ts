import type { App } from 'vue'
import { setupErrorHandler } from './setup-error-handler'
import { setupHttpClient } from './setup-http-client'
import { setupPinia } from './setup-pinia'
import { setupRouter } from './setup-router'
import { setupTheme } from './setup-theme'
import { setupVuetify } from './setup-vuetify'

export function setupProviders (app: App) {
  const pinia = setupPinia(app)
  const httpClient = setupHttpClient(app)
  setupErrorHandler(app)
  setupTheme(app)
  const vuetify = setupVuetify(app)
  const router = setupRouter(app)

  return {
    pinia,
    httpClient,
    vuetify,
    router,
  }
}
