<script setup lang="ts">
/**
 * Доменная обёртка над <v-btn> (по ADR-0007, Фаза 2.6).
 *
 * Принимает проектный API (variant/size/loading/...), внутри маппит
 * на Vuetify-пропсы. Когда в Фазе 2.7 реализация заменится на
 * shadcn-vue + Tailwind — поменяется только шаблон, потребители
 * не трогаются.
 *
 * **Тестируется через Storybook stories**, не Vitest: рендер v-btn
 * требует Vuetify CSS, что несовместимо с лёгким vitest.config.
 * Unit-тесты появятся в Фазе 2.7 после замены реализации.
 */
  import { VBtn } from 'vuetify/components'

  type Variant = 'primary' | 'secondary' | 'tonal' | 'text' | 'destructive'
  type Size = 'sm' | 'md' | 'lg'

  const props = withDefaults(defineProps<{
    variant?: Variant
    size?: Size
    loading?: boolean
    disabled?: boolean
    block?: boolean
    type?: 'button' | 'submit' | 'reset'
    /**
     * Icon-only режим. Если задан — кнопка рендерится квадратной с одной
     * иконкой (semantic = `<button aria-label>`). После Фазы 2.7 — это
     * shadcn-vue Button с `size="icon"` + `<Icon name="...">`.
     */
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

  const vuetifyVariant = computed(() => {
    switch (props.variant) {
      case 'tonal': { return 'tonal' as const }
      case 'text': { return 'text' as const }
      default: { return 'elevated' as const }
    }
  })

  const vuetifyColor = computed(() => {
    switch (props.variant) {
      case 'primary': { return 'primary' }
      case 'secondary': { return 'secondary' }
      case 'destructive': { return 'error' }
      default: { return undefined }
    }
  })

  const vuetifySize = computed(() => {
    switch (props.size) {
      case 'sm': { return 'small' as const }
      case 'lg': { return 'large' as const }
      default: { return 'default' as const }
    }
  })
</script>

<template>
  <VBtn
    :block="block"
    :color="vuetifyColor"
    :disabled="disabled"
    :icon="icon"
    :loading="loading"
    :size="vuetifySize"
    :type="type"
    :variant="vuetifyVariant"
    @click="$emit('click', $event)"
  >
    <template v-if="!icon">
      <slot name="prepend" />
      <slot />
      <slot name="append" />
    </template>
  </VBtn>
</template>
