/**
 * main.ts
 */
import App from '@/app/App.vue'
import { setupProviders } from '@/app/providers'
import { runBootstrapProcess } from '@/processes/app-bootstrap'
// Inter Variable — self-hosted (без внешних запросов к Google Fonts, без FOUC).
// Имя семейства 'Inter Variable' используется в --font-sans (typography.css).
import '@fontsource-variable/inter'
import '@/shared/assets/tokens/index.css'
import '@/shared/assets/tailwind.css'

async function bootstrapApplication () {
  const app = createApp(App)
  const { router } = setupProviders(app)
  app.mount('#app')
  await runBootstrapProcess({ router })
}

bootstrapApplication()
