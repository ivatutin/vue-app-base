<script setup lang="ts">
/**
 * PasswordInput — поле пароля с eye-toggle и опц. strength meter.
 *
 * Strength scale (опц., :show-strength) — 4 уровня:
 * 0 weak (< 8 chars) — красный
 * 1 fair (≥ 8 chars) — оранжевый
 * 2 good (≥ 12 chars) — желтый
 * 3 strong (≥ 12 chars + diversity 3+ типов) — зелёный
 * 4 strong (≥ 16 chars + diversity 3+ типов) — emerald (brand)
 *
 * Это **подсказка**, не строгая валидация. NIST SP 800-63B рекомендует
 * длину как primary metric. Реальная политика — Keycloak realm
 * (length(12)).
 *
 * Интеграция с Form: с :name внутри <Form :schema> — useField, иначе
 * controlled v-model + dev-warn (как TextField / OtpInput).
 */
  import { useField } from 'vee-validate'
  import { inject } from 'vue'
  import { cn } from '@/shared/lib/utils/cn'
  import { FORM_CONTEXT_KEY } from '../form/form-context'
  import Icon from '../icon/Icon.vue'
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
    showStrength?: boolean
  }>(), {
    modelValue: '',
    disabled: false,
    required: false,
    autocomplete: 'new-password',
    showStrength: false,
  })

  const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

  const hasFormContext = inject(FORM_CONTEXT_KEY, false)
  const useVeeField = Boolean(props.name) && hasFormContext

  if (props.name && !hasFormContext && import.meta.env.DEV) {
    console.warn(
      `[PasswordInput] name="${props.name}" используется без <Form :schema>. Фоллбэк на v-model. Оберни поле в <Form :schema="..."> или убери :name.`,
    )
  }

  const field = useVeeField ? useField<string>(props.name!) : null

  const visible = ref(false)
  const id = useId()

  const currentValue = computed<string>(() => (field ? field.value.value ?? '' : props.modelValue))
  const currentError = computed<string | null | undefined>(() => (field ? field.errorMessage.value : props.error))
  const errorId = computed(() => (currentError.value ? `${id}-error` : undefined))

  function onInput (e: Event) {
    const v = (e.target as HTMLInputElement).value
    if (field) field.handleChange(v)
    else emit('update:modelValue', v)
  }

  function onBlur () {
    field?.handleBlur()
  }

  function toggle () {
    visible.value = !visible.value
  }

  function score (v: string): number {
    if (!v) return 0
    let types = 0
    if (/[a-z]/.test(v)) types++
    if (/[A-Z]/.test(v)) types++
    if (/\d/.test(v)) types++
    if (/[^A-Za-z0-9]/.test(v)) types++

    if (v.length < 8) return 0
    if (v.length < 12) return 1
    if (v.length < 16) return types >= 3 ? 3 : 2
    return types >= 3 ? 4 : 3
  }

  const strength = computed(() => score(currentValue.value))

  const strengthLabel = computed(() => {
    switch (strength.value) {
      case 0: { return 'Очень слабый'
      }
      case 1: { return 'Слабый'
      }
      case 2: { return 'Средний'
      }
      case 3: { return 'Хороший'
      }
      case 4: { return 'Сильный'
      }
      default: { return ''
      }
    }
  })

  const strengthColor = computed(() => {
    switch (strength.value) {
      case 0: { return 'bg-error'
      }
      case 1: { return 'bg-orange-500'
      }
      case 2: { return 'bg-yellow-500'
      }
      case 3: { return 'bg-green-500'
      }
      case 4: { return 'bg-brand'
      }
      default: { return 'bg-muted'
      }
    }
  })
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
    <div class="relative">
      <input
        :id="id"
        :aria-describedby="errorId"
        :aria-invalid="currentError ? true : undefined"
        :autocomplete="autocomplete"
        :class="cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 pr-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          currentError && 'border-error focus-visible:ring-error',
        )"
        :disabled="disabled"
        :name="name"
        :placeholder="placeholder"
        :required="required"
        :type="visible ? 'text' : 'password'"
        :value="currentValue"
        @blur="onBlur"
        @input="onInput"
      >
      <button
        :aria-label="visible ? 'Скрыть пароль' : 'Показать пароль'"
        :aria-pressed="visible"
        class="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        tabindex="-1"
        type="button"
        @click="toggle"
      >
        <Icon :name="visible ? 'mdi-eye-off' : 'mdi-eye'" size="sm" />
      </button>
    </div>
    <div
      v-if="showStrength && currentValue"
      :aria-label="`Сила пароля: ${strengthLabel}`"
      class="space-y-1"
      role="status"
    >
      <div class="flex gap-1">
        <div
          v-for="i in 4"
          :key="i"
          :class="cn('h-1 flex-1 rounded-full', i <= strength ? strengthColor : 'bg-muted')"
        />
      </div>
      <p class="text-xs text-muted-foreground">{{ strengthLabel }}</p>
    </div>
    <p v-if="currentError" :id="errorId" class="text-xs text-error">
      {{ currentError }}
    </p>
  </div>
</template>
