// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import vuetify from 'eslint-config-vuetify'
import storybook from 'eslint-plugin-storybook'

/**
 * Vuetify полностью удалён из проекта (Фаза 2.9, ADR-0007). Прежние
 * правила запрета прямых <v-*> / import 'vuetify' (см. git history)
 * больше не нужны.
 *
 * eslint-config-vuetify оставлен — это просто Vue/TS-конвенции
 * (fork стандартных), к runtime-зависимости Vuetify не привязан.
 * Миграция на @vue/eslint-config-typescript — отдельная задача
 * при необходимости.
 */
export default [
  ...(await vuetify()),
  ...storybook.configs['flat/recommended'],

  /**
   * Type-aware правила. Базовый конфиг работает без информации о типах,
   * поэтому целый класс ошибок ему не виден — в первую очередь
   * «забытый await». Для проекта с async-bootstrap, refresh-мьютексом
   * и auth-flow это главный источник тихих багов: промис уходит
   * в unhandled rejection, а поток продолжается как ни в чём не бывало.
   *
   * `projectService` дороже по времени, поэтому включён точечно —
   * только на исходники, без конфигов и stories.
   */
  {
    files: ['src/**/*.ts', 'src/**/*.vue'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
    rules: {
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
]
