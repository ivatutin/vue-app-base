import type { ThemeDefinition } from 'vuetify'

/**
 * Vuetify-тема, собранная из design tokens.
 *
 * Источник истины — CSS-vars в src/shared/assets/tokens/ (ADR-0007).
 * Здесь — JS-зеркало для Vuetify, которое требует литералы цветов
 * на момент createVuetify() — runtime-чтение CSS-vars невозможно
 * (Vuetify-тема инициализируется до маунта).
 *
 * **При смене значения в tokens/colors.css — обязательно обновить
 * здесь то же значение.** Это переходный долг до Фазы 2.9 (удаления
 * Vuetify), после чего этот файл удалится.
 *
 * RGB triplet → hex для удобства Vuetify (он принимает любой CSS-цвет).
 */

const lightColors = {
  'background': '#ffffff',
  'surface': '#fafafa',
  'primary': '#18181b',
  'primary-darken-1': '#09090b',
  'secondary': '#f4f4f5',
  'secondary-darken-1': '#e4e4e7',
  'error': '#ef4444',
  'info': '#0ea5e9',
  'success': '#22c55e',
  'warning': '#eab308',
} as const

const darkColors = {
  'background': '#09090b',
  'surface': '#18181b',
  'primary': '#fafafa',
  'primary-darken-1': '#e4e4e7',
  'secondary': '#27272a',
  'secondary-darken-1': '#3f3f46',
  'error': '#f87171',
  'info': '#38bdf8',
  'success': '#4ade80',
  'warning': '#facc15',
} as const

export const lightTheme: ThemeDefinition = {
  dark: false,
  colors: lightColors,
}

export const darkTheme: ThemeDefinition = {
  dark: true,
  colors: darkColors,
}
