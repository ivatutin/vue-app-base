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
  // `app.use(router)` внутри стартует первую навигацию синхронно, но её
  // guard дожидается восстановления сессии (whenSessionRestored), поэтому
  // порядок «провайдеры → mount → bootstrap» безопасен и сохраняет
  // мгновенный splash: App.vue рисует прелоадер, пока идёт bootstrap.
  const { router } = setupProviders(app)
  app.mount('#app')
  await runBootstrapProcess({ router })
}

// runBootstrapProcess сам переводит стор в failed и не пробрасывает
// отказ дальше — этот catch на случай падения самих провайдеров,
// когда показать что-либо средствами приложения уже нельзя.
bootstrapApplication().catch((error: unknown) => {
  console.error('[bootstrap] fatal', error)
})
