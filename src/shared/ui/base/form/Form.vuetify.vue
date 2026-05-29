<script setup lang="ts">
/**
 * Тонкая обёртка над <v-form> + prevent.submit (ADR-0007, Фаза 2.6).
 *
 * Реальная form-валидация — отдельный шаг (Фаза 2.8 миграции,
 * VeeValidate + Zod-resolver).
 */
  import { VForm } from 'vuetify/components'

  defineEmits<{ submit: [] }>()
</script>

<template>
  <VForm @submit.prevent="$emit('submit')">
    <slot />
  </VForm>
</template>
