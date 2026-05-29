<script setup lang="ts">
/**
 * Entry-обёртка List. Выбирает реализацию по env.VITE_UI_IMPL
 * (vuetify | shadcn) — strangler fig pattern Фазы 2.7 миграции
 * (ADR-0007).
 */
  import { env } from '@/shared/config'
  import ListShadcn from './List.shadcn.vue'
  import ListVuetify from './List.vuetify.vue'

  withDefaults(defineProps<{
    density?: 'default' | 'compact' | 'comfortable'
    nav?: boolean
  }>(), {
    density: 'default',
    nav: false,
  })

  const Impl = env.VITE_UI_IMPL === 'shadcn' ? ListShadcn : ListVuetify
</script>

<template>
  <component :is="Impl" :density="density" :nav="nav">
    <slot />
  </component>
</template>
