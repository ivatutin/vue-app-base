<script setup lang="ts">
/**
 * Entry-обёртка Menu. Выбирает реализацию по env.VITE_UI_IMPL
 * (vuetify | shadcn) — strangler fig pattern Фазы 2.7 миграции
 * (ADR-0007).
 */
  import { env } from '@/shared/config'
  import MenuShadcn from './Menu.shadcn.vue'
  import MenuVuetify from './Menu.vuetify.vue'

  type Location
    = | 'top'
      | 'bottom'
      | 'start'
      | 'end'
      | 'top start'
      | 'top end'
      | 'bottom start'
      | 'bottom end'

  withDefaults(defineProps<{
    closeOnContentClick?: boolean
    location?: Location
  }>(), {
    closeOnContentClick: true,
    location: 'bottom',
  })

  const Impl = env.VITE_UI_IMPL === 'shadcn' ? MenuShadcn : MenuVuetify
</script>

<template>
  <component
    :is="Impl"
    :close-on-content-click="closeOnContentClick"
    :location="location"
  >
    <template #activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps" />
    </template>
    <slot />
  </component>
</template>
