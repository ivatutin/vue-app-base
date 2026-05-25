import type { App } from 'vue'
import { createPinia } from 'pinia'

export function setupPinia (app: App): ReturnType<typeof createPinia> {
  const pinia = createPinia()
  app.use(pinia)
  return pinia
}
