<script setup lang="ts">
/**
 * Entry-обёртка Icon. Выбирает реализацию по env.VITE_UI_IMPL
 * (vuetify | shadcn) — strangler fig pattern Фазы 2.7 миграции
 * (ADR-0007).
 *
 * Контракт `name: string` сейчас принимает MDI-имена (`mdi-*`)
 * для совместимости с обеими реализациями. Семантические имена —
 * после Шага 14 (удаление vuetify-версии).
 */
  import { env } from '@/shared/config'
  import IconShadcn from './Icon.shadcn.vue'
  import IconVuetify from './Icon.vuetify.vue'

  type Size = 'sm' | 'md' | 'lg' | 'xl'

  withDefaults(defineProps<{
    name: string
    size?: Size
    color?: string
  }>(), {
    size: 'md',
  })

  const Impl = env.VITE_UI_IMPL === 'shadcn' ? IconShadcn : IconVuetify
</script>

<template>
  <component
    :is="Impl"
    :color="color"
    :name="name"
    :size="size"
  />
</template>
