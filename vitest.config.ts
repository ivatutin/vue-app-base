import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import { defineConfig } from 'vitest/config'

/**
 * Лёгкий конфиг для Vitest: только то, что нужно тестам.
 *
 * Vue plugin подключён для тестов с full-render .vue компонентов
 * (Form, TextField, OtpInput, etc — см. ADR-0010 после M0.B).
 *
 * AutoImport обязателен: production-код опирается на глобальные
 * defineStore / ref / computed / storeToRefs (см. vite.config.mts).
 * Без него любой импорт setup-стора в тесте падает с
 * `ReferenceError: defineStore is not defined`.
 *
 * Storybook addon-vitest НЕ подключаем — он требует playwright-browser
 * режим, что несовместимо с лёгким конфигом. Stories проверяются через
 * `npm run build-storybook`, визуальный smoke — через `npm run storybook`.
 */
export default defineConfig({
  plugins: [
    vue(),
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
