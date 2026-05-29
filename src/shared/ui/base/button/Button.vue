<script setup lang="ts">
/**
 * Entry-обёртка Button. Выбирает реализацию по env.VITE_UI_IMPL
 * (vuetify | shadcn) — strangler fig pattern Фазы 2.7 миграции
 * (ADR-0007).
 */
  import { env } from '@/shared/config'
  import ButtonShadcn from './Button.shadcn.vue'
  import ButtonVuetify from './Button.vuetify.vue'

  type Variant = 'primary' | 'secondary' | 'tonal' | 'text' | 'destructive'
  type Size = 'sm' | 'md' | 'lg'

  withDefaults(defineProps<{
    variant?: Variant
    size?: Size
    loading?: boolean
    disabled?: boolean
    block?: boolean
    type?: 'button' | 'submit' | 'reset'
    icon?: string
  }>(), {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    block: false,
    type: 'button',
    icon: undefined,
  })

  defineEmits<{ click: [event: MouseEvent] }>()

  const Impl = env.VITE_UI_IMPL === 'shadcn' ? ButtonShadcn : ButtonVuetify
</script>

<template>
  <component
    :is="Impl"
    :block="block"
    :disabled="disabled"
    :icon="icon"
    :loading="loading"
    :size="size"
    :type="type"
    :variant="variant"
    @click="(event: MouseEvent) => $emit('click', event)"
  >
    <template #prepend>
      <slot name="prepend" />
    </template>
    <slot />
    <template #append>
      <slot name="append" />
    </template>
  </component>
</template>
