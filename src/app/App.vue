<script lang="ts" setup>
  import { VueQueryDevtools } from '@tanstack/vue-query-devtools'
  import { useBootstrapStore } from '@/entities/bootstrap'
  import { AppPreloader } from '@/widgets/app-preloader'

  const bootstrap = useBootstrapStore()
  const isDev = import.meta.env.DEV
</script>

<template>
  <router-view v-if="bootstrap.isReady" />
  <AppPreloader v-else />
  <!--
    DevTools панель TanStack Query: список queries, кэш, мутации,
    invalidate вручную. Только в dev-сборке — production tree-shake'нет
    через if-проверку и dependency lazy-load.
  -->
  <VueQueryDevtools v-if="isDev" />
</template>
