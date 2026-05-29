<script setup lang="ts">
/**
 * Entry-обёртка Card. Выбирает реализацию по env.VITE_UI_IMPL
 * (vuetify | shadcn) — strangler fig pattern Фазы 2.7 миграции
 * (ADR-0007).
 */
  import { env } from '@/shared/config'
  import CardShadcn from './Card.shadcn.vue'
  import CardVuetify from './Card.vuetify.vue'

  withDefaults(defineProps<{
    width?: string | number
    title?: string
  }>(), {})

  const Impl = env.VITE_UI_IMPL === 'shadcn' ? CardShadcn : CardVuetify
</script>

<template>
  <component :is="Impl" :title="title" :width="width">
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    <slot />
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </component>
</template>
