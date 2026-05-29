<script setup lang="ts">
/**
 * Entry-обёртка Spacer. Выбирает реализацию по env.VITE_UI_IMPL
 * (vuetify | shadcn) — strangler fig pattern Фазы 2.7 миграции
 * (ADR-0007). После полного перехода на shadcn-vue Spacer.vuetify.vue
 * удалится и entry превратится в re-export shadcn-версии.
 *
 * Оба импорта попадают в bundle во время миграции — это ожидаемо.
 */
  import { env } from '@/shared/config'
  import SpacerShadcn from './Spacer.shadcn.vue'
  import SpacerVuetify from './Spacer.vuetify.vue'

  const Impl = env.VITE_UI_IMPL === 'shadcn' ? SpacerShadcn : SpacerVuetify
</script>

<template>
  <component :is="Impl" />
</template>
