import type { Preview } from '@storybook/vue3-vite'

// Design tokens + Tailwind v4 — shadcn-обёртки рендерятся в проектной
// теме. Vuetify-стили намеренно не подключаются: с Фазы 2.7.14 все
// shared/ui/base/* реализованы на shadcn-vue + reka-ui + Tailwind.
import '../src/shared/assets/tokens/index.css'
import '../src/shared/assets/tailwind.css'

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
