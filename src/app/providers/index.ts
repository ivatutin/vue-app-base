import type { App } from 'vue'
import { setupPinia } from './setup-pinia'
import { setupHttpClient } from './setup-http-client'
import { setupRouter } from './setup-router'
import { setupVuetify } from './setup-vuetify'

export function setupProviders(app: App) {
  const pinia = setupPinia(app)
  const httpClient = setupHttpClient(app)
  const vuetify = setupVuetify(app)
  const router = setupRouter(app)

  return {
    pinia,
    httpClient,
    vuetify,
    router,
  }
}
