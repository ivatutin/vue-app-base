import type { Preview } from '@storybook/vue3-vite'
import { setup } from '@storybook/vue3-vite'
import { createVuetify } from 'vuetify'
import * as vComponents from 'vuetify/components'

import { darkTheme, lightTheme } from '../src/app/providers/vuetify-theme'
// Применяем design tokens + Tailwind, чтобы stories рендерились
// в проектной теме.
import '../src/shared/assets/tokens/index.css'
import '../src/shared/assets/tailwind.css'
// Vuetify-стили подключены **временно** для Фазы 2.6 — обёртки в
// shared/ui/base/ пока рендерят <v-btn>/etc внутри. После Фазы 2.7
// (замена реализации на shadcn-vue) — этот импорт удалить вместе с
// setup(createVuetify) ниже.
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

setup(app => {
  const vuetify = createVuetify({
    components: vComponents,
    theme: { defaultTheme: 'light', themes: { light: lightTheme, dark: darkTheme } },
  })
  app.use(vuetify)
})

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      // 'todo' — нарушения видны в test UI, не валят CI.
      // Переключим на 'error' когда наберётся 5+ компонентов.
      test: 'todo',
    },
  },
}

export default preview
