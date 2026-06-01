/**
 * Vuetify-провайдер. Файл остаётся orphan'ом после Фазы 2.8 — никто
 * его не импортирует. Будет удалён в Фазе 2.9 вместе с npm-пакетами
 * vuetify, vite-plugin-vuetify, @mdi/font.
 *
 * Содержимое сохранено как историческая ссылка на bootstrap, чтобы при
 * необходимости отката можно было быстро вернуть. После удаления пакетов
 * в Фазе 2.9 — этот файл и vuetify-theme.ts удалить.
 */
import type { App } from 'vue'
import { createVuetify } from 'vuetify'
import { darkTheme, lightTheme } from './vuetify-theme'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

export function setupVuetify (app: App): ReturnType<typeof createVuetify> {
  const vuetify = createVuetify({
    theme: {
      defaultTheme: 'system',
      themes: {
        light: lightTheme,
        dark: darkTheme,
      },
    },
  })
  app.use(vuetify)
  return vuetify
}
