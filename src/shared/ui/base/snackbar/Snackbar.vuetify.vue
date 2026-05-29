<script setup lang="ts">
/**
 * Обёртка над <v-snackbar> (ADR-0007, Фаза 2.6).
 *
 * API спроектирован под use case "стек уведомлений": один Snackbar
 * на одну запись из notification-store. Видимостью управляет
 * потребитель (рендерит/убирает из списка), обёртка эмитит `close`
 * по таймауту или клику на крестик.
 *
 * После Фазы 2.7 — реализация на radix-vue Toast / shadcn-vue Sonner,
 * публичный API остаётся.
 */
  import { VBtn, VSnackbar } from 'vuetify/components'

  type Kind = 'info' | 'success' | 'warning' | 'error'
  type Location
    = | 'top'
      | 'top right'
      | 'top left'
      | 'bottom'
      | 'bottom right'
      | 'bottom left'

  withDefaults(defineProps<{
    kind?: Kind
    message: string
    /** -1 = без авто-dismiss, иначе ms до закрытия */
    timeout?: number
    closable?: boolean
    location?: Location
  }>(), {
    kind: 'info',
    timeout: -1,
    closable: true,
    location: 'top right',
  })

  const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <VSnackbar
    :color="kind"
    :location="location"
    :model-value="true"
    multi-line
    :timeout="timeout"
    @update:model-value="(v) => !v && emit('close')"
  >
    {{ message }}
    <template v-if="closable" #actions>
      <VBtn
        icon="mdi-close"
        size="small"
        variant="text"
        @click="emit('close')"
      />
    </template>
  </VSnackbar>
</template>
