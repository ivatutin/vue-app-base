<script setup lang="ts">
/**
 * Entry-обёртка Snackbar. Выбирает реализацию по env.VITE_UI_IMPL
 * (vuetify | shadcn) — strangler fig pattern Фазы 2.7 миграции
 * (ADR-0007).
 */
  import { env } from '@/shared/config'
  import SnackbarShadcn from './Snackbar.shadcn.vue'
  import SnackbarVuetify from './Snackbar.vuetify.vue'

  type Kind = 'info' | 'success' | 'warning' | 'error'
  type Location
    = | 'top' | 'top right' | 'top left'
      | 'bottom' | 'bottom right' | 'bottom left'

  withDefaults(defineProps<{
    kind?: Kind
    message: string
    timeout?: number
    closable?: boolean
    location?: Location
  }>(), {
    kind: 'info',
    timeout: -1,
    closable: true,
    location: 'top right',
  })

  defineEmits<{ close: [] }>()

  const Impl = env.VITE_UI_IMPL === 'shadcn' ? SnackbarShadcn : SnackbarVuetify
</script>

<template>
  <component
    :is="Impl"
    :closable="closable"
    :kind="kind"
    :location="location"
    :message="message"
    :timeout="timeout"
    @close="$emit('close')"
  />
</template>
