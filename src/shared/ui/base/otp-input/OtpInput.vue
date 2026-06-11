<script setup lang="ts">
/**
 * OtpInput — 6-сегментный код подтверждения. См. ADR-0011.
 *
 * Поведение:
 * - Цифровой ввод: следующий сегмент в фокусе
 * - Backspace на пустом сегменте: переход на предыдущий
 * - Paste 6-значного кода: autofill всех сегментов
 * - autocomplete="one-time-code" на первом сегменте → iOS keyboard
 *   предложит SMS-код
 * - WebOTP API (Android Chrome): автоподхват кода из SMS — composable
 *   useWebOtp подключим в Phase 2 (требует HTTPS + bound to current
 *   origin SMS). Сейчас scaffold через AbortController в onMounted
 * - НЕ auto-submit при заполнении 6-й цифры (ADR-0011): пользователь
 *   жмёт Enter / submit-button явно
 *
 * Интеграция с Form:
 * - С :name внутри <Form :schema> — useField (как TextField)
 * - Без :name — controlled v-model
 *
 * Анти-паттерны:
 * - НЕ логируем OTP в console / Sentry
 * - НЕ показываем уже введённый код в плейсхолдере при resend
 */
  import { useField } from 'vee-validate'
  import { inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { cn } from '@/shared/lib/utils/cn'
  import { FORM_CONTEXT_KEY } from '../form/form-context'

  const props = withDefaults(defineProps<{
    name?: string
    modelValue?: string
    length?: number
    error?: string | null
    disabled?: boolean
  }>(), {
    modelValue: '',
    length: 6,
    disabled: false,
  })

  const emit = defineEmits<{
    'update:modelValue': [value: string]
    'complete': [value: string]
  }>()

  const hasFormContext = inject(FORM_CONTEXT_KEY, false)
  const useVeeField = Boolean(props.name) && hasFormContext

  if (props.name && !hasFormContext && import.meta.env.DEV) {
    console.warn(
      `[OtpInput] name="${props.name}" используется без <Form :schema>. Фоллбэк на v-model. Оберни поле в <Form :schema="..."> или убери :name.`,
    )
  }

  const field = useVeeField ? useField<string>(props.name!) : null

  const inputs = ref<HTMLInputElement[]>([])
  const cells = ref<string[]>(Array.from({ length: props.length }, () => ''))

  function syncCellsFromValue (value: string) {
    const digits = (value ?? '').replace(/\D/g, '').slice(0, props.length).split('')
    cells.value = Array.from({ length: props.length }, (_, i) => digits[i] ?? '')
  }

  function joined (): string {
    return cells.value.join('')
  }

  function commit () {
    const v = joined()
    if (field) {
      field.handleChange(v)
    } else {
      emit('update:modelValue', v)
    }
    if (v.length === props.length) emit('complete', v)
  }

  const current = field ? field.value : null
  syncCellsFromValue(current?.value ?? props.modelValue)

  watch(
    () => (field ? field.value.value : props.modelValue),
    v => {
      if (v !== joined()) syncCellsFromValue(v ?? '')
    },
  )

  function focusIndex (i: number) {
    const el = inputs.value[Math.max(0, Math.min(i, props.length - 1))]
    if (el) {
      el.focus()
      el.select()
    }
  }

  function onInput (i: number, e: Event) {
    const input = e.target as HTMLInputElement
    const raw = input.value.replace(/\D/g, '')

    if (raw.length > 1) {
      const digits = raw.slice(0, props.length).split('')
      for (let j = 0; j < props.length; j++) {
        cells.value[j] = digits[j] ?? ''
      }
      commit()
      const lastFilled = Math.min(digits.length, props.length) - 1
      nextTick(() => focusIndex(lastFilled + 1))
      return
    }

    cells.value[i] = raw
    input.value = raw
    commit()

    if (raw && i < props.length - 1) {
      nextTick(() => focusIndex(i + 1))
    }
  }

  function onKeydown (i: number, e: KeyboardEvent) {
    if (e.key === 'Backspace') {
      if (cells.value[i]) {
        cells.value[i] = ''
        commit()
      } else if (i > 0) {
        focusIndex(i - 1)
        cells.value[i - 1] = ''
        commit()
        e.preventDefault()
      }
      return
    }
    if (e.key === 'ArrowLeft' && i > 0) {
      focusIndex(i - 1)
      e.preventDefault()
      return
    }
    if (e.key === 'ArrowRight' && i < props.length - 1) {
      focusIndex(i + 1)
      e.preventDefault()
    }
  }

  function onPaste (e: ClipboardEvent) {
    e.preventDefault()
    const text = e.clipboardData?.getData('text') ?? ''
    const digits = text.replace(/\D/g, '').slice(0, props.length).split('')
    if (digits.length === 0) return
    for (let j = 0; j < props.length; j++) {
      cells.value[j] = digits[j] ?? ''
    }
    commit()
    nextTick(() => focusIndex(Math.min(digits.length, props.length - 1)))
  }

  function onBlur () {
    field?.handleBlur()
  }

  const currentError = computed<string | null | undefined>(() => {
    if (field) return field.errorMessage.value
    return props.error
  })

  // WebOTP API — Android Chrome. Перехватывает SMS-код из allow-listed sender.
  // В iOS работает через autocomplete="one-time-code" на нативном keyboard.
  let webOtpAbort: AbortController | null = null
  onMounted(async () => {
    if (typeof navigator === 'undefined') return
    if (!('credentials' in navigator) || !('OTPCredential' in window)) return
    webOtpAbort = new AbortController()
    try {
      const credential = await (navigator.credentials as unknown as {
        get: (o: unknown) => Promise<{ code: string } | null>
      }).get({
        otp: { transport: ['sms'] },
        signal: webOtpAbort.signal,
      })
      if (credential?.code) {
        const digits = credential.code.replace(/\D/g, '').slice(0, props.length).split('')
        for (let j = 0; j < props.length; j++) cells.value[j] = digits[j] ?? ''
        commit()
      }
    } catch {
      // ignore: user dismissed, timeout, или browser не поддерживает
    }
  })
  onBeforeUnmount(() => webOtpAbort?.abort())
</script>

<template>
  <div class="space-y-1.5">
    <div class="flex gap-2" @paste="onPaste">
      <input
        v-for="(_, i) in cells"
        :key="i"
        :ref="el => { if (el) inputs[i] = el as HTMLInputElement }"
        :aria-invalid="currentError ? true : undefined"
        :aria-label="`Цифра ${i + 1} из ${length}`"
        :autocomplete="i === 0 ? 'one-time-code' : 'off'"
        :class="cn(
          'h-12 w-12 rounded-md border border-input bg-background text-center font-mono text-xl ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          currentError && 'border-error focus-visible:ring-error',
        )"
        :disabled="disabled"
        inputmode="numeric"
        maxlength="1"
        pattern="\d*"
        type="text"
        :value="cells[i]"
        @blur="onBlur"
        @input="onInput(i, $event)"
        @keydown="onKeydown(i, $event)"
      >
    </div>
    <p v-if="currentError" class="text-xs text-error">{{ currentError }}</p>
  </div>
</template>
