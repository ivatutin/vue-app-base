<script setup lang="ts">
/**
 * Entry-обёртка Divider. Выбирает реализацию по env.VITE_UI_IMPL
 * (vuetify | shadcn) — strangler fig pattern Фазы 2.7 миграции
 * (ADR-0007). После полного перехода на shadcn-vue Divider.vuetify.vue
 * удалится и entry превратится в re-export shadcn-версии.
 */
  import { env } from '@/shared/config'
  import DividerShadcn from './Divider.shadcn.vue'
  import DividerVuetify from './Divider.vuetify.vue'

  withDefaults(defineProps<{
    vertical?: boolean
  }>(), { vertical: false })

  const Impl = env.VITE_UI_IMPL === 'shadcn' ? DividerShadcn : DividerVuetify
</script>

<template>
  <component :is="Impl" :vertical="vertical" />
</template>
