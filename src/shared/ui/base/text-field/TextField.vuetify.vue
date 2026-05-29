<script setup lang="ts">
/**
 * Обёртка над <v-text-field> (ADR-0007, Фаза 2.6).
 *
 * Поведение error: непустая строка → отображается под полем,
 * пустая/undefined → не показывается. Это упрощает интеграцию с
 * VeeValidate/Zod (Фаза 2.8).
 */
  import { VTextField } from 'vuetify/components'

  type Size = 'sm' | 'md' | 'lg'

  const props = withDefaults(defineProps<{
    modelValue?: string
    label?: string
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
    placeholder?: string
    error?: string | null
    disabled?: boolean
    required?: boolean
    autocomplete?: string
    size?: Size
  }>(), {
    modelValue: '',
    type: 'text',
    size: 'md',
    disabled: false,
    required: false,
  })

  defineEmits<{ 'update:modelValue': [value: string] }>()

  const density = computed(() => {
    switch (props.size) {
      case 'sm': { return 'compact' as const }
      case 'lg': { return 'comfortable' as const }
      default: { return 'default' as const }
    }
  })
</script>

<template>
  <VTextField
    :autocomplete="autocomplete"
    :density="density"
    :disabled="disabled"
    :error-messages="error ? [error] : []"
    :label="label"
    :model-value="modelValue"
    :placeholder="placeholder"
    :required="required"
    :type="type"
    variant="outlined"
    @update:model-value="(value: string) => $emit('update:modelValue', value)"
  />
</template>
