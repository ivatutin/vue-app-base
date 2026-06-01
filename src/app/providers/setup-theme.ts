import type { App } from 'vue'
import { initThemeProvider } from '@/shared/lib/theme'

/**
 * Provider темы (Фаза 2.8, ADR-0007). Eager-init нашего собственного
 * `useTheme()` composable — устанавливает реактивный state, listener
 * на prefers-color-scheme и watcher'ы (sync .dark class + persist
 * в localStorage).
 *
 * Должен вызываться **раньше** setupVuetify — пока Vuetify тоже в
 * проекте (Фаза 2.8 переходный период), но **наш** ThemeProvider —
 * единственный источник истины. Vuetify-bridge (effectScope+watch на
 * theme.global.name) уйдёт на следующем шаге, когда AppHeader перейдёт
 * с `useTheme()` из 'vuetify' на наш.
 *
 * Anti-FOUC: до этого provider'а inline-script в index.html уже
 * установил .dark класс. Здесь только активируем reactive-cycle.
 */
export function setupTheme (_app: App): void {
  initThemeProvider()
}
