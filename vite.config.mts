import { fileURLToPath, URL } from 'node:url'
import Tailwind from '@tailwindcss/vite'
import Vue from '@vitejs/plugin-vue'
// Plugins
import AutoImport from 'unplugin-auto-import/vite'
import Fonts from 'unplugin-fonts/vite'
import Components from 'unplugin-vue-components/vite'
import { VueRouterAutoImports } from 'unplugin-vue-router'
import VueRouter from 'unplugin-vue-router/vite'
// Utilities
import { defineConfig } from 'vite'

import Layouts from 'vite-plugin-vue-layouts-next'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    VueRouter({
      routesFolder: [
        {
          src: 'src/pages',
          path: (file: string) => {
            const reg = /.+\/src\/pages\/(.+)\/ui\/\w+Page\.vue$/
            const matches = file.match(reg)
            if (matches) {
              return matches[1]
            } else {
              const prefix = 'src/pages'
              return file.slice(file.lastIndexOf(prefix) + prefix.length + 1)
            }
          },
        },
        // 'src/pages',
        // {
        //   src: 'src/features',
        //   filePatterns: (filePatterns) => ['**/pages/**/*'],
        //   path: (file) => {
        //      const prefix = 'src/features'
        //      return file.slice(file.lastIndexOf(prefix) + prefix.length + 1).replace('/pages', '')
        //   },
        // }
      ],
      dts: 'src/typed-router.d.ts',
      logs: true,
      importMode: 'async',
      extensions: ['.vue'],
      // beforeWriteFiles: (routes) => {
      //   console.log('Найдены маршруты:', routes)
      //   return routes
      // }
    }),
    Layouts({
      layoutsDirs: 'src/app/layouts',
      defaultLayout: 'default',
    }),
    AutoImport({
      imports: [
        'vue',
        VueRouterAutoImports,
        {
          pinia: ['defineStore', 'storeToRefs'],
        },
      ],
      dts: 'src/auto-imports.d.ts',
      eslintrc: {
        enabled: true,
      },
      vueTemplate: true,
    }),
    Components({
      dirs: [
        'src/shared/components',
        'src/shared/components/*',
      ],
      dts: 'src/components.d.ts',
    }),
    Vue(),
    Tailwind(),
    Fonts({
      fontsource: {
        families: [
          {
            name: 'Roboto',
            weights: [100, 300, 400, 500, 700, 900],
            styles: ['normal', 'italic'],
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    exclude: [
      'vue-router',
      'unplugin-vue-router/runtime',
      'unplugin-vue-router/data-loaders',
      'unplugin-vue-router/data-loaders/basic',
    ],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('src', import.meta.url)),
    },
    extensions: [
      '.js',
      '.json',
      '.jsx',
      '.mjs',
      '.ts',
      '.tsx',
      '.vue',
    ],
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
