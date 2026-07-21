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
      // dts НЕ генерируем: vite.config.mts пишет тот же (коммитнутый)
      // файл с `vueTemplate: true`, а этот конфиг — без него, и урезал
      // его со 151 строки до 79, вырезая блок ComponentCustomProperties.
      // Тестам d.ts не нужен — типы проверяет vue-tsc по vite-конфигу.
      dts: false,
    }),
  ],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['src/**/*.{test,spec}.{ts,js}'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,js}',
        'src/**/*.stories.ts',
        'src/**/index.ts',
        'src/**/*.d.ts',
        'src/app/main.ts',
      ],
      /**
       * Пороги — храповик против регресса, а не цель. Выставлены чуть
       * ниже фактических значений на момент включения (2026-07-21:
       * statements 35.8 / branches 29.4 / functions 25.6 / lines 36.1).
       *
       * Замер общепроектный (`include` покрывает весь src, а не только
       * файлы, которых коснулись тесты). Так цифру нельзя улучшить,
       * просто не написав тест: новый непокрытый модуль её опускает.
       * Отсюда и скромные значения — они честные.
       *
       * Поднимай пороги вслед за ростом покрытия, вручную.
       */
      thresholds: {
        statements: 34,
        branches: 28,
        functions: 24,
        lines: 34,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
  },
})
