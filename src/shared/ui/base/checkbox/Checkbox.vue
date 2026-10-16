<script setup lang="ts">
/**
 * Checkbox — флажок с подписью. Обёртка над нативным `<input type="checkbox">`
 * (без reka-ui: для чекбокса достаточно нативного контрола, а он даёт
 * корректную клавиатуру, `:checked` и формы «из коробки»).
 *
 * Два режима — как у `TextField` / `PhoneInput`:
 * - с `:name` внутри `<Form :schema>` — подписывается на field-state через
 *   vee-validate `useField(name)`; `modelValue` и `@update:modelValue` не нужны;
 * - без `:name` — controlled `v-model` (boolean) + внешний `:error`.
 *
 * Подпись задаётся пропом `label` или слотом (когда в тексте нужна ссылка:
 * ставь на неё `@click.stop`, иначе клик по ссылке переключит флажок).
 *
 * a11y: `label↔input` через `useId()`, ошибка — `aria-invalid` +
 * `aria-describedby`.
 */
  import { useField } from 'vee-validate'
  import { inject } from 'vue'
  import { cn } from '@/shared/lib/utils/cn'
  import { FORM_CONTEXT_KEY } from '../form/form-context'

  const props = withDefaults(defineProps<{
    name?: string
    modelValue?: boolean
    label?: string
    error?: string | null
    disabled?: boolean
    required?: boolean
  }>(), {
    modelValue: false,
    disabled: false,
    required: false,
  })

  const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

  const hasFormContext = inject(FORM_CONTEXT_KEY, false)
  const useVeeField = Boolean(props.name) && hasFormContext

  if (props.name && !hasFormContext && import.meta.env.DEV) {
    console.warn(
      `[Checkbox] name="${props.name}" используется без <Form :schema>. Фоллбэк на v-model. Оберни поле в <Form :schema="..."> или убери :name.`,
    )
  }

  const field = useVeeField ? useField<boolean>(props.name!) : null

  const id = useId()

  const currentValue = computed<boolean>(() => {
    if (field) return Boolean(field.value.value)
    return props.modelValue
  })

  const currentError = computed<string | null | undefined>(() =>
    field ? field.errorMessage.value : props.error,
  )

  const errorId = computed(() => (currentError.value ? `${id}-error` : undefined))

  function onChange (event: Event) {
    const checked = (event.target as HTMLInputElement).checked
    if (field) {
      field.handleChange(checked)
    } else {
      emit('update:modelValue', checked)
    }
  }

  function onBlur () {
    field?.handleBlur()
  }
</script>

<template>
  <div class="space-y-1.5">
    <label
      :class="
        cn(
          'flex items-start gap-2.5 text-sm select-none',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        )
      "
      :for="id"
    >
      <input
        :id="id"
        :aria-describedby="errorId"
        :aria-invalid="currentError ? true : undefined"
        :checked="currentValue"
        :class="
          cn(
            'mt-0.5 size-4 shrink-0 rounded border border-input accent-brand',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            currentError && 'border-error',
          )
        "
        :disabled="disabled"
        :name="name"
        :required="required"
        type="checkbox"
        @blur="onBlur"
        @change="onChange"
      >
      <span class="leading-snug">
        <slot>{{ label }}</slot>
      </span>
    </label>
    <p v-if="currentError" :id="errorId" class="text-xs text-error">
      {{ currentError }}
    </p>
  </div>
</template>
