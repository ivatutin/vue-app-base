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
]
