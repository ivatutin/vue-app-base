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
