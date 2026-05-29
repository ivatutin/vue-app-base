<script setup lang="ts">
/**
 * Entry-обёртка ListItem. Выбирает реализацию по env.VITE_UI_IMPL
 * (vuetify | shadcn) — strangler fig pattern Фазы 2.7 миграции
 * (ADR-0007).
 */
  import type { RouteLocationRaw } from 'vue-router'
  import { env } from '@/shared/config'
  import ListItemShadcn from './ListItem.shadcn.vue'
  import ListItemVuetify from './ListItem.vuetify.vue'

  withDefaults(defineProps<{
    icon?: string
    title?: string
    to?: RouteLocationRaw
    href?: string
    active?: boolean
    disabled?: boolean
  }>(), {
    icon: undefined,
    title: undefined,
    to: undefined,
    href: undefined,
    active: false,
    disabled: false,
  })

  defineEmits<{ click: [event: MouseEvent | KeyboardEvent] }>()

  const Impl = env.VITE_UI_IMPL === 'shadcn' ? ListItemShadcn : ListItemVuetify
</script>

<template>
  <component
    :is="Impl"
    :active="active"
    :disabled="disabled"
    :href="href"
    :icon="icon"
    :title="title"
    :to="to"
    @click="(event: MouseEvent | KeyboardEvent) => $emit('click', event)"
  >
    <slot />
  </component>
</template>
