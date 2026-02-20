/// <reference types="vite/client" />
/// <reference types="unplugin-vue-router/client" />
/// <reference types="vite-plugin-vue-layouts-next/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_HOST: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
