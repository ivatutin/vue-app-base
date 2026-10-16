<script setup lang="ts">
  import type { OtpPurpose } from '@/shared/model/otp'
  /**
 * PhoneVerificationForm — шаг «телефон → код → `verificationToken`».
 *
 * Один виджет на два сценария: регистрация (`purpose: 'sign-up'`) и вход
 * (`'sign-in'`) — отличаются подписью кнопки и наличием чекбокса согласия.
 *
 * Наружу отдаём `verified` с одноразовым `verificationToken`: в сторе он не хранится
 * (ADR-0011 § Anti-patterns), его предъявляет вызывающая страница в `sign-up/phone`
 * или `sign-in/phone`.
 *
 * Состояние челленджа (FSM, cooldown, разбор кодов ошибок) живёт в
 * `useOtpChallengeStore`; при размонтировании сбрасываем — иначе на следующем экране
 * остался бы чужой челлендж и его таймеры.
 */
  import { useOtpChallengeStore } from '@/entities/otp-challenge'
  import { phoneSchema } from '@/shared/model/phone'
  import { Alert, Button, Checkbox, OtpInput, PhoneInput } from '@/shared/ui/base'

  const props = withDefaults(defineProps<{
    purpose: OtpPurpose
    /** Показывать чекбокс согласия с условиями (регистрация). */
    requireTerms?: boolean
    submitLabel?: string
    disabled?: boolean
  }>(), {
    requireTerms: false,
    submitLabel: 'Получить код',
    disabled: false,
  })

  const emit = defineEmits<{
    verified: [payload: { phone: string, verificationToken: string, acceptedTerms: boolean }]
  }>()

  const otp = useOtpChallengeStore()

  const phone = ref('')
  const code = ref('')
  const acceptedTerms = ref(false)
  const submitting = ref(false)

  const phoneValid = computed(() => phoneSchema.safeParse(phone.value).success)
  const termsOk = computed(() => !props.requireTerms || acceptedTerms.value)

  /** Шаг ввода кода: челлендж есть и он не «номер уже занят». */
  const isCodeStep = computed(() => otp.challenge !== null && otp.status !== 'alreadyExists')

  const canSend = computed(() => phoneValid.value && termsOk.value && !otp.isBusy && !props.disabled)
  const canVerify = computed(() => code.value.length === 6 && !otp.isBusy && !submitting.value)

  async function send (): Promise<void> {
    if (!canSend.value) {
      return
    }
    try {
      await otp.send(phone.value, props.purpose)
    } catch {
      // Сообщение и статус уже в сторе (`otp.error`), здесь ловить нечего.
    }
  }

  async function resend (): Promise<void> {
    try {
      await otp.resend()
      code.value = ''
    } catch {
      // см. `send`
    }
  }

  async function submitCode (): Promise<void> {
    if (!canVerify.value) {
      return
    }
    submitting.value = true
    try {
      const verification = await otp.verify(code.value)
      emit('verified', {
        phone: phone.value,
        verificationToken: verification.verificationToken,
        acceptedTerms: acceptedTerms.value,
      })
    } catch {
      // `invalid` / `locked` / `expired` — статус и текст в сторе.
      code.value = ''
    } finally {
      submitting.value = false
    }
  }

  function changePhone (): void {
    otp.reset()
    code.value = ''
  }

  onBeforeUnmount(() => otp.reset())
</script>

<template>
  <div class="space-y-4">
    <Alert v-if="otp.error" density="compact" kind="error">
      {{ otp.error }}
    </Alert>
    <Alert v-if="otp.status === 'alreadyExists'" density="compact" kind="info">
      Номер уже зарегистрирован — войдите по телефону на странице входа.
    </Alert>
    <Alert v-if="otp.status === 'locked'" density="compact" kind="warning">
      Попытки исчерпаны. Запросите новый код.
    </Alert>

    <template v-if="!isCodeStep">
      <PhoneInput
        v-model="phone"
        :disabled="otp.isBusy || disabled"
        label="Телефон"
        required
      />
      <Checkbox v-if="requireTerms" v-model="acceptedTerms">
        <span>Принимаю условия использования и обработку персональных данных</span>
      </Checkbox>
    </template>

    <template v-else>
      <p class="text-sm text-muted-foreground">
        Код отправлен на <span class="font-medium">{{ otp.challenge?.target }}</span>.
        <button class="text-brand underline" type="button" @click="changePhone">
          Изменить номер
        </button>
      </p>

      <OtpInput
        v-model="code"
        :disabled="otp.isBusy || submitting || disabled"
        :length="otp.challenge?.codeLength"
      />

      <p class="text-xs text-muted-foreground">
        <template v-if="otp.status === 'expired'">
          Код больше не действует — запросите новый.
        </template>
        <template v-else-if="otp.cooldownLeft > 0">
          Повторная отправка возможна через {{ otp.cooldownLeft }} с.
        </template>
        <template v-else>
          Код действует ограниченное время.
        </template>
      </p>
    </template>

    <div class="flex flex-wrap gap-2">
      <Button
        v-if="!isCodeStep"
        :disabled="!canSend"
        :loading="otp.isBusy"
        variant="brand"
        @click="send"
      >
        {{ submitLabel }}
      </Button>

      <template v-else>
        <Button
          :disabled="!canVerify"
          :loading="otp.isBusy || submitting"
          variant="brand"
          @click="submitCode"
        >
          Подтвердить
        </Button>
        <Button
          :disabled="!otp.canResend || disabled"
          variant="outlined"
          @click="resend"
        >
          Отправить ещё раз
        </Button>
      </template>
    </div>
  </div>
</template>
