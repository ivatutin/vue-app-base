<script setup lang="ts">
/**
 * shadcn-vue реализация TextField — composite Label + Input +
 * error message. Адаптирован под наш API (modelValue / label / error /
 * disabled / required / type / placeholder / autocomplete / size / name).
 *
 * Два режима:
 * - С :name внутри <Form :schema> — подписывается на field-state через
 *   vee-validate useField(name). modelValue / error / @blur — игнорируются,
 *   значения текут через form-context. Валидация по blur + при submit.
 * - Без :name — controlled v-model (как сейчас). :error — внешняя ошибка.
 *
 * Защита от silent malfunction: :name без родительского <Form :schema>
 * → dev-warn в console + fallback на v-model режим.
 *
 * Дизайн-токены: --color-input (border), --color-background,
 * --color-muted-foreground (placeholder), --color-ring (focus),
 * --color-error (error state).
 *
 * a11y: label↔input связаны через useId(), error экспонируется как
 * aria-invalid + aria-describedby.
 */
  import { useField } from 'vee-validate'
  import { inject } from 'vue'
  import { cn } from '@/shared/lib/utils/cn'
  import { FORM_CONTEXT_KEY } from '../form/form-context'
  import Input from '../input/Input.vue'
  import Label from '../label/Label.vue'

  type Size = 'sm' | 'md' | 'lg'

  const props = withDefaults(defineProps<{
    name?: string
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

  const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

  const hasFormContext = inject(FORM_CONTEXT_KEY, false)
  const useVeeField = Boolean(props.name) && hasFormContext

  if (props.name && !hasFormContext && import.meta.env.DEV) {
    console.warn(
      `[TextField] name="${props.name}" используется без <Form :schema>. Фоллбэк на v-model. Оберни поле в <Form :schema="..."> или убери :name.`,
    )
  }

  const field = useVeeField ? useField<string>(props.name!) : null

  const currentValue = computed<string>(() => {
    if (field) return field.value.value ?? ''
    return props.modelValue
  })

  const currentError = computed<string | null | undefined>(() => {
    if (field) return field.errorMessage.value
    return props.error
  })

  function onInput (value: string) {
    if (field) {
      field.handleChange(value)
    } else {
      emit('update:modelValue', value)
    }
  }

  function onBlur () {
    field?.handleBlur()
  }

  const id = useId()
  const errorId = computed(() => (currentError.value ? `${id}-error` : undefined))

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
      :aria-invalid="currentError ? true : undefined"
      :autocomplete="autocomplete"
      :class="cn(
        heightClass,
        currentError && 'border-error focus-visible:ring-error',
      )"
      :disabled="disabled"
      :model-value="currentValue"
      :name="name"
      :placeholder="placeholder"
      :required="required"
      :type="type"
      @blur="onBlur"
      @update:model-value="(value) => onInput(String(value))"
    />
    <p v-if="currentError" :id="errorId" class="text-xs text-error">
      {{ currentError }}
    </p>
  </div>
</template>
