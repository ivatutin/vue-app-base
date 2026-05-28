import type { Preview } from '@storybook/vue3-vite'

// Применяем design tokens + Tailwind, чтобы stories рендерились
// в проектной теме. Vuetify-стили НЕ импортируем — будущие обёртки
// в shared/ui/base/ должны быть рендерабельны без Vuetify.
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
