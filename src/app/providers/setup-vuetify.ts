import type { App } from 'vue'
import { watch } from 'vue'
import { createVuetify } from 'vuetify'
import { darkTheme, lightTheme } from './vuetify-theme'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

/**
 * Bridge между Vuetify theme и Tailwind dark variant — переходный
 * до Фазы 2.8 (свой ThemeProvider). shared/ui/base/* shadcn-обёртки
 * реагируют на тему только через класс `.dark` на <html> (по Tailwind
 * v4 @custom-variant dark). Без этого моста theme.toggle() меняет
 * Vuetify-состояние, но shadcn-компоненты остаются в light.
 *
 * В Фазе 2.8 заменится на собственный composable useTheme(), который
 * сам управляет .dark классом + localStorage + prefers-color-scheme.
 */
function syncTailwindDarkClass (themeName: string): void {
  const root = document.documentElement
  root.classList.toggle('dark', themeName === 'dark')
}

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

  syncTailwindDarkClass(vuetify.theme.global.name.value)
  watch(vuetify.theme.global.name, syncTailwindDarkClass)

  return vuetify
}
