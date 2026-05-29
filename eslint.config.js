// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import vuetify from 'eslint-config-vuetify'
import storybook from 'eslint-plugin-storybook'
import vuePlugin from 'eslint-plugin-vue'

/**
 * Whitelist для прямого использования Vuetify (по ADR-0007):
 * - shared/ui/base/** — слой обёрток (Фаза 2.6 миграции).
 * - app/providers/setup-vuetify.ts + vuetify-theme.ts — bootstrap Vuetify.
 * - app/layouts/** — пока v-app/v-main используются как shell;
 *   в Фазе 2.8 переедут на свой layout без Vuetify.
 * - widgets/app-header, app-sidebar, app-footer, app-preloader —
 *   рендерят v-app-bar/v-navigation-drawer/etc, тоже подлежат
 *   замене в Фазах 2.6-2.7.
 * - pages/system, pages/ui-kit — мигрируют после обёрток.
 *
 * Этот whitelist **постепенно сужается** по мере миграции: когда
 * widget/page переписан через shared/ui/base/, его путь убирается
 * отсюда. К Фазе 2.9 (удаление Vuetify) whitelist пустеет.
 */
const VUETIFY_ALLOWED = [
  'src/shared/ui/base/**',
  'src/app/App.vue',
  'src/app/providers/setup-vuetify.ts',
  'src/app/providers/vuetify-theme.ts',
  'src/app/layouts/**',
  // widgets/app-notifications мигрирован на Snackbar (Фаза 2.6.4).
  'src/widgets/app-header/**',
  'src/widgets/app-sidebar/**',
  'src/widgets/app-footer/**',
  'src/widgets/app-preloader/**',
  'src/pages/system/**',
  'src/pages/ui-kit/**',
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
              'Direct Vuetify/MDI imports запрещены вне whitelist (ADR-0007). Используй обёртки shared/ui/base/ или добавь путь в VUETIFY_ALLOWED.',
          },
        ],
      }],
      // 2. Запрет <v-*> тегов в шаблонах через vue/no-restricted-syntax.
      //    AST-селектор VElement[rawName=/^v-/] ловит любые шаблонные
      //    Vuetify-компоненты (v-btn, v-card, ...).
      'vue/no-restricted-syntax': ['error', {
        selector: 'VElement[rawName=/^v-/]',
        message:
          'Direct <v-*> запрещён вне whitelist (ADR-0007). Используй <Button>/<Card>/... из shared/ui/base/.',
      }],
    },
  },
  ...storybook.configs['flat/recommended'],
]
