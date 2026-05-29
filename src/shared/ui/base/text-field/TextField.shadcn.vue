<script setup lang="ts">
/**
 * shadcn-vue реализация TextField — composite Label + Input +
 * error message. Адаптирован под наш API (modelValue / label / error /
 * disabled / required / type / placeholder / autocomplete / size).
 *
 * Дизайн-токены: --color-input (border), --color-background,
 * --color-muted-foreground (placeholder), --color-ring (focus),
 * --color-error (error state).
 *
 * a11y: label↔input связаны через useId(), error экспонируется как
 * aria-invalid + aria-describedby.
 */
  import { cn } from '@/shared/lib/utils/cn'
  import Input from '../input/Input.vue'
  import Label from '../label/Label.vue'

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

  const id = useId()
  const errorId = computed(() => (props.error ? `${id}-error` : undefined))

  const heightClass = computed(() => ({
    sm: 'h-9',
    md: 'h-10',
    lg: 'h-11',
  })[props.size])
</script>

<template>
  <div class="space-y-1.5">
    <Label
      v-if="label"
      :class="cn(
        'block',
        required && 'after:content-[\'_*\'] after:text-error after:ml-0.5',
      )"
      :for="id"
    >
      {{ label }}
    </Label>
    <Input
      :id="id"
      :aria-describedby="errorId"
      :aria-invalid="error ? true : undefined"
      :autocomplete="autocomplete"
      :class="cn(
        heightClass,
        error && 'border-error focus-visible:ring-error',
      )"
      :disabled="disabled"
      :model-value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :type="type"
      @update:model-value="(value) => $emit('update:modelValue', String(value))"
    />
    <p v-if="error" :id="errorId" class="text-xs text-error">
      {{ error }}
    </p>
  </div>
</template>
