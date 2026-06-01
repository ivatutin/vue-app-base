// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import vuetify from 'eslint-config-vuetify'
import storybook from 'eslint-plugin-storybook'
import vuePlugin from 'eslint-plugin-vue'

/**
 * Whitelist для прямого использования Vuetify (по ADR-0007).
 *
 * После Фазы 2.8 остались **только** orphan-файлы провайдера:
 * - setup-vuetify.ts + vuetify-theme.ts — никто не вызывает, tree-shake
 *   уберёт из bundle. Удалятся в Фазе 2.9 вместе с npm-пакетами.
 *
 * Когда Фаза 2.9 закроется — этот whitelist + правила можно удалить
 * целиком.
 */
const VUETIFY_ALLOWED = [
  'src/app/providers/setup-vuetify.ts',
  'src/app/providers/vuetify-theme.ts',
]

export default [
  ...(await vuetify()),
  {
    name: 'project/no-direct-vuetify',
    files: ['src/**/*.{vue,ts,js}'],
    ignores: VUETIFY_ALLOWED,
    plugins: { vue: vuePlugin },
    rules: {
      // 1. Запрет JS-импортов из 'vuetify' и Material Design Icons.
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['vuetify', 'vuetify/*', '@mdi/font/*'],
            message:
              'Direct Vuetify/MDI imports запрещены вне whitelist (ADR-0007). Используй обёртки shared/ui/base/.',
          },
        ],
      }],
      // 2. Запрет <v-*> тегов в шаблонах через vue/no-restricted-syntax.
      'vue/no-restricted-syntax': ['error', {
        selector: 'VElement[rawName=/^v-/]',
        message:
          'Direct <v-*> запрещён вне whitelist (ADR-0007). Используй <Button>/<Card>/... из shared/ui/base/.',
      }],
    },
  },
  ...storybook.configs['flat/recommended'],
]
