<script setup lang="ts">
/**
 * Обёртка над <v-alert> (ADR-0007, Фаза 2.6).
 *
 * Цвета берутся из design tokens через Vuetify-палитру (info/success/
 * warning/error). После Фазы 2.7 — Tailwind-классы.
 */
  import { VAlert } from 'vuetify/components'

  type Kind = 'info' | 'success' | 'warning' | 'error'

  withDefaults(defineProps<{
    kind?: Kind
    variant?: 'tonal' | 'outlined' | 'flat'
    density?: 'compact' | 'default'
    closable?: boolean
  }>(), {
    kind: 'info',
    variant: 'tonal',
    density: 'default',
    closable: false,
  })

  defineEmits<{ close: [] }>()
</script>

<template>
  <VAlert
    :closable="closable"
    :density="density"
    :type="kind"
    :variant="variant"
    @click:close="$emit('close')"
  >
    <slot />
  </VAlert>
</template>
