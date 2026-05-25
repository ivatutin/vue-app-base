import type { App } from 'vue'
import { createVuetify } from 'vuetify'
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

export function setupVuetify (app: App): ReturnType<typeof createVuetify> {
  const vuetify = createVuetify({
    theme: {
      defaultTheme: 'system',
    },
  })
  app.use(vuetify)

  return vuetify
}
