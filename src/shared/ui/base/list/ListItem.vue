<script setup lang="ts">
/**
 * Обёртка над <v-list-item> (ADR-0007, Фаза 2.6).
 *
 * Контракт упрощён до того, что реально нужно: title (slot или prop),
 * иконка слева, навигационный target. После Фазы 2.7 — <RouterLink>
 * со стилизацией Tailwind и focus-ring через radix-vue primitives.
 */
  import type { RouteLocationRaw } from 'vue-router'
  import { VListItem } from 'vuetify/components'

  withDefaults(defineProps<{
    /** Иконка слева (mdi-* до Фазы 2.7) */
    icon?: string
    /** Заголовок (если slot не задан) */
    title?: string
    /** Куда вести (опционально). При наличии — рендерится как router-link. */
    to?: RouteLocationRaw
    /** Внешняя ссылка (опционально). Взаимоисключает с `to`. */
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
</script>

<template>
  <VListItem
    :active="active"
    :disabled="disabled"
    :href="href"
    :prepend-icon="icon"
    :title="title"
    :to="to"
    @click="(event: MouseEvent | KeyboardEvent) => $emit('click', event)"
  >
    <slot />
  </VListItem>
</template>
