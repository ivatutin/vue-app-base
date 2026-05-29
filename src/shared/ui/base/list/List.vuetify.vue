<script setup lang="ts">
/**
 * Обёртка над <v-list> (ADR-0007, Фаза 2.6).
 *
 * Контейнер для ListItem. После Фазы 2.7 — обычный <nav>/<ul>
 * с Tailwind-классами, ListItem перейдёт на ul>li-семантику.
 */
  import { VList } from 'vuetify/components'

  withDefaults(defineProps<{
    density?: 'default' | 'compact' | 'comfortable'
    nav?: boolean
  }>(), {
    density: 'default',
    nav: false,
  })
</script>

<template>
  <VList :density="density" :nav="nav">
    <slot />
  </VList>
</template>
