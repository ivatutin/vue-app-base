<script setup lang="ts">
/**
 * Entry-обёртка Form. Выбирает реализацию по env.VITE_UI_IMPL
 * (vuetify | shadcn) — strangler fig pattern Фазы 2.7 миграции
 * (ADR-0007).
 */
  import { env } from '@/shared/config'
  import FormShadcn from './Form.shadcn.vue'
  import FormVuetify from './Form.vuetify.vue'

  defineEmits<{ submit: [] }>()

  const Impl = env.VITE_UI_IMPL === 'shadcn' ? FormShadcn : FormVuetify
</script>

<template>
  <component :is="Impl" @submit="$emit('submit')">
    <slot />
  </component>
</template>
