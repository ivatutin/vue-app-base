import type { App } from 'vue'
import { setupPinia } from './setup-pinia'
import { setupHttpClient } from './setup-http-client'
import { setupErrorHandler } from './setup-error-handler'
import { setupRouter } from './setup-router'
import { setupVuetify } from './setup-vuetify'

export function setupProviders(app: App) {
  const pinia = setupPinia(app)
  const httpClient = setupHttpClient(app)
  setupErrorHandler(app)
  const vuetify = setupVuetify(app)
  const router = setupRouter(app)

  return {
    pinia,
    httpClient,
    vuetify,
    router,
  }
}
