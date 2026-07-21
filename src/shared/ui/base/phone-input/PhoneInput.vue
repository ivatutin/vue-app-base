<script setup lang="ts">
/**
 * PhoneInput — поле телефона с RU-маской и нормализацией в E.164.
 *
 * Поведение:
 * - Live-маска через libphonenumber-js AsYouType('RU') — пользователь
 *   печатает цифры, маска подставляется: `+7 999 123-45-67`
 * - Приведение к российской форме делает `maskFromRaw`: любой ввод
 *   (8-960, 7-960, +7-960, 960) разворачивается в `+7...`
 * - Наружу отдаём `+` + цифры маски. На полном номере это готовый
 *   E.164 (`+79991234567`), на недонаборе — короткий префикс
 *
 * **Компонент RU-only.** Международные номера не поддерживаются:
 * `+49 30 123456` будет молча превращён в `+7 49 30 123456`. Нужен
 * мультистрановой ввод — это отдельный компонент с выбором страны.
 *
 * Контракт modelValue:
 * - Внешне — `+` и цифры. Полным (валидным E.164) значение становится
 *   только когда номер донабран; промежуточные значения тоже эмитятся,
 *   чтобы схема могла показать «неполный номер», а не «поле пустое»
 * - Внутри — masked display state
 *
 * Интеграция с Form: с :name внутри <Form :schema> — useField (схема
 * получит уже нормализованный E.164), иначе controlled v-model.
 */
  import { AsYouType } from 'libphonenumber-js'
  import { useField } from 'vee-validate'
  import { inject, ref, watch } from 'vue'
  import { cn } from '@/shared/lib/utils/cn'
  import { FORM_CONTEXT_KEY } from '../form/form-context'
  import Label from '../label/Label.vue'

  const props = withDefaults(defineProps<{
    name?: string
    modelValue?: string
    label?: string
    placeholder?: string
    error?: string | null
    disabled?: boolean
    required?: boolean
    autocomplete?: string
  }>(), {
    modelValue: '',
    placeholder: '+7 (___) ___-__-__',
    disabled: false,
    required: false,
    autocomplete: 'tel',
  })

  const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

  const hasFormContext = inject(FORM_CONTEXT_KEY, false)
  const useVeeField = Boolean(props.name) && hasFormContext

  if (props.name && !hasFormContext && import.meta.env.DEV) {
    console.warn(
      `[PhoneInput] name="${props.name}" используется без <Form :schema>. Фоллбэк на v-model. Оберни поле в <Form :schema="..."> или убери :name.`,
    )
  }

  const field = useVeeField ? useField<string>(props.name!) : null

  const id = useId()
  const currentError = computed<string | null | undefined>(() =>
    field ? field.errorMessage.value : props.error,
  )
  const errorId = computed(() => (currentError.value ? `${id}-error` : undefined))

  function maskFromRaw (raw: string): string {
    const digits = raw.replace(/\D/g, '')
    if (!digits) return ''
    const formatter = new AsYouType('RU')
    // если пользователь начал не с 7/8 — префиксуем +7, чтобы маска
    // развернулась как российская
    const withCountry = (digits.startsWith('7') || digits.startsWith('8'))
      ? `+7${digits.slice(1)}`
      : `+7${digits}`
    return formatter.input(withCountry)
  }

  const display = ref<string>(maskFromRaw(props.modelValue))

  /**
   * `maskFromRaw` уже привёл цифры к российской форме (`7` + 10 цифр),
   * поэтому наружу достаточно отдать `+` + эти цифры. Прогонять их
   * ЕЩЁ РАЗ через `normalizePhone` нельзя: на недонабранном номере
   * (9 введённых цифр → ровно 10 в строке) срабатывала его ветка
   * «10 цифр = номер без кода страны», и к уже существующей `7`
   * дописывалась вторая. Наружу уходил `+779991234567` — валидный
   * по E164_REGEX номер чужого абонента, без единой ошибки валидации.
   */
  function commit () {
    const digits = display.value.replace(/\D/g, '')
    const value = digits ? `+${digits}` : ''
    if (field) {
      field.handleChange(value)
    } else {
      emit('update:modelValue', value)
    }
  }

  function onInput (e: Event) {
    const input = e.target as HTMLInputElement
    display.value = maskFromRaw(input.value)
    commit()
  }

  function onBlur () {
    field?.handleBlur()
  }

  // sync извне (когда modelValue изменили снаружи: setFieldValue / v-model)
  watch(
    () => (field ? field.value.value : props.modelValue),
    v => {
      const normalizedDisplay = v ? maskFromRaw(v) : ''
      // не reset когда display уже совпадает по сырым цифрам — иначе
      // курсор будет прыгать при каждом keypress
      const displayDigits = display.value.replace(/\D/g, '')
      const incomingDigits = (v ?? '').replace(/\D/g, '')
      if (displayDigits !== incomingDigits) display.value = normalizedDisplay
    },
  )
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
    <input
      :id="id"
      :aria-describedby="errorId"
      :aria-invalid="currentError ? true : undefined"
      :autocomplete="autocomplete"
      :class="cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        currentError && 'border-error focus-visible:ring-error',
      )"
      :disabled="disabled"
      inputmode="tel"
      :name="name"
      :placeholder="placeholder"
      :required="required"
      type="tel"
      :value="display"
      @blur="onBlur"
      @input="onInput"
    >
    <p v-if="currentError" :id="errorId" class="text-xs text-error">
      {{ currentError }}
    </p>
  </div>
</template>
