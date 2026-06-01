import { computed, effectScope, ref, watch } from 'vue'

/**
 * ThemeProvider (Фаза 2.8 миграции, ADR-0007). Заменяет Vuetify-овский
 * `useTheme()` своим composable + .dark class на html (Tailwind v4
 * @custom-variant dark). Подписан на prefers-color-scheme, persist'ит
 * выбор в localStorage.
 *
 * Singleton-state на module scope — все потребители видят одну и ту же
 * тему. initThemeProvider() вызывается из setup-theme.ts провайдера
 * **один раз** при старте приложения; idempotent.
 *
 * Anti-FOUC: inline-script в index.html устанавливает .dark класс ДО
 * загрузки JS — синхронизировано с тем же STORAGE_KEY и логикой mode.
 */
export type ThemeMode = 'light' | 'dark' | 'system'
export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = '__app-theme'

const mode = ref<ThemeMode>('system')
const systemPrefersDark = ref(false)

const currentTheme = computed<Theme>(() => {
  if (mode.value === 'system') {
    return systemPrefersDark.value ? 'dark' : 'light'
  }
  return mode.value
})

const isDark = computed(() => currentTheme.value === 'dark')

let initialized = false

/**
 * Eager init темы. Вызывается из setup-theme.ts. В SSR-окружении
 * (typeof window === 'undefined') noop — safe для unit-тестов без DOM.
 */
export function initThemeProvider (): void {
  if (initialized || typeof window === 'undefined') {
    return
  }
  initialized = true

  // 1. Init mode из localStorage (если есть валидное значение).
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    mode.value = stored
  }

  // 2. systemPrefersDark + listener.
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  systemPrefersDark.value = media.matches
  media.addEventListener('change', event => {
    systemPrefersDark.value = event.matches
  })

  // 3. watch'ы — sync .dark класс + persist mode. effectScope(true)
  //    нужен, потому что initThemeProvider() вызывается вне Vue setup().
  //    Getter-форма () => currentTheme.value — для устойчивости к
  //    module-level computed (надёжнее, чем передача ref напрямую).
  effectScope(true).run(() => {
    watch(
      () => currentTheme.value,
      theme => {
        document.documentElement.classList.toggle('dark', theme === 'dark')
      },
      { immediate: true },
    )

    watch(
      () => mode.value,
      newMode => {
        window.localStorage.setItem(THEME_STORAGE_KEY, newMode)
      },
    )
  })
}

/**
 * Сброс state для unit-тестов. Не использовать в production-коде.
 */
export function _resetThemeForTests (): void {
  initialized = false
  mode.value = 'system'
  systemPrefersDark.value = false
}

export function useTheme () {
  return {
    /** Текущий выбор пользователя: 'light' | 'dark' | 'system' */
    mode: computed(() => mode.value),
    /** Фактическая тема (для 'system' — резолвится в light/dark) */
    currentTheme,
    /** Удобный alias для currentTheme === 'dark' */
    isDark,
    setMode (m: ThemeMode): void {
      mode.value = m
    },
    /**
     * Переключить между светлой и тёмной. Если был 'system' —
     * переключается на явный выбор, противоположный текущему.
     */
    toggle (): void {
      mode.value = currentTheme.value === 'dark' ? 'light' : 'dark'
    },
  }
}
