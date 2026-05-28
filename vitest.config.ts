import { fileURLToPath, URL } from 'node:url'
import AutoImport from 'unplugin-auto-import/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import { defineConfig } from 'vitest/config'

/**
 * Лёгкий конфиг для Vitest: только то, что нужно тестам.
 *
 * Vue + Vuetify плагины НЕ подключены намеренно — для unit-тестов на
 * чистые функции / сторы / lib они избыточны и тормозят старт. Когда
 * понадобятся тесты на .vue с full-render — добавим Vue-плагин точечно.
 *
 * AutoImport обязателен: production-код опирается на глобальные
 * defineStore / ref / computed / storeToRefs (см. vite.config.mts).
 * Без него любой импорт setup-стора в тесте падает с
 * `ReferenceError: defineStore is not defined`.
 *
 * Storybook addon-vitest НЕ подключаем — он требует playwright-browser
 * режим и Vue-плагин, что несовместимо с лёгким конфигом. Stories
 * проверяются через `npm run build-storybook`, визуальный smoke — через
 * `npm run storybook`.
 */
export default defineConfig({
  plugins: [
    AutoImport({
      imports: [
        'vue',
        VueRouterAutoImports,
        {
          pinia: ['defineStore', 'storeToRefs'],
        },
      ],
      dts: 'src/auto-imports.d.ts',
    }),
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{ts,js}'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
})
