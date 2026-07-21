import type { App } from 'vue'
import { whenSessionRestored } from '@/processes/app-bootstrap'
import { setupErrorHandler } from './setup-error-handler'
import { setupHttpClient } from './setup-http-client'
import { setupPinia } from './setup-pinia'
import { setupQueryClient } from './setup-query-client'
import { setupRouter } from './setup-router'
import { setupTheme } from './setup-theme'

export function setupProviders (app: App) {
  const pinia = setupPinia(app)
  const httpClient = setupHttpClient(app)
  setupErrorHandler(app)
  setupTheme(app)
  const queryClient = setupQueryClient(app)
  const router = setupRouter(app, { waitForSession: whenSessionRestored })

  return {
    pinia,
    httpClient,
    queryClient,
    router,
  }
}
