<script setup lang="ts">
  import type { OtpDelivery, OtpPurpose } from '@/shared/model/otp'
  /**
 * PhoneVerificationForm — шаг «телефон → подтверждение → `verificationToken`».
 *
 * Один виджет на два сценария (регистрация `sign-up` и вход `sign-in`) и на два
 * канала (ADR-0011 / ADR-0014):
 * - **код из SMS** — `useOtpChallengeStore`: отправка, ввод кода, cooldown;
 * - **обратный звонок** — `usePhoneCallStore`: пользователь звонит на сервисный номер,
 *   статус приходит опросом (`200 + status`), токен — тот же, что у SMS.
 *
 * Переключатель каналов живёт здесь, потому что различаются только механика ожидания:
 * номер, согласие с условиями и результат (`verified` с токеном) — общие.
 * Наружу отдаём только токен: в сторах он не хранится (ADR-0011 § Anti-patterns).
 */
  import { useOtpChallengeStore, usePhoneCallStore } from '@/entities/otp-challenge'
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
  const call = usePhoneCallStore()

  const phone = ref('')
  const code = ref('')
  const acceptedTerms = ref(false)
  const delivery = ref<OtpDelivery>('otp')
  const submitting = ref(false)

  const phoneValid = computed(() => phoneSchema.safeParse(phone.value).success)
  const termsOk = computed(() => !props.requireTerms || acceptedTerms.value)

  /** Шаг звонка: челлендж есть и он не «номер уже занят». */
  const isCallStep = computed(() => call.challenge !== null && call.state !== 'alreadyExists')

  /** Шаг ввода кода: SMS-челлендж есть и он не «номер уже занят». */
  const isCodeStep = computed(() => otp.challenge !== null && otp.status !== 'alreadyExists')

  const step = computed<'phone' | 'otp' | 'call'>(() => {
    if (isCallStep.value) {
      return 'call'
    }
    if (isCodeStep.value) {
      return 'otp'
    }
    return 'phone'
  })

  const canSend = computed(() => phoneValid.value && termsOk.value && !isBusy.value && !props.disabled)
  const canVerify = computed(() => code.value.length === 6 && !isBusy.value && !submitting.value)
  const isBusy = computed(() => otp.isBusy || call.isActive || submitting.value)

  /** `tel:`-ссылка из человекочитаемого номера: `+7 (800) 500-8275` → `tel:+78005008275`. */
  const callTel = computed(() => {
    const target = call.challenge?.callTo
    return target ? `tel:${target.replace(/[^\d+]/g, '')}` : undefined
  })

  function emitVerified (verificationToken: string): void {
    emit('verified', {
      phone: phone.value,
      verificationToken,
      acceptedTerms: acceptedTerms.value,
    })
  }

  async function send (): Promise<void> {
    if (!canSend.value) {
      return
    }
    try {
      await otp.send(phone.value, props.purpose)
    } catch {
      // Текст и статус уже в сторе (`otp.error`).
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
      emitVerified(verification.verificationToken)
    } catch {
      // `invalid` / `locked` / `expired` — статус и текст в сторе.
      code.value = ''
    } finally {
      submitting.value = false
    }
  }

  /** Смена канала: `call` — старт звонкового челленджа, `otp` — обычная отправка кода. */
  async function startCall (): Promise<void> {
    if (!canSend.value) {
      return
    }
    try {
      await call.start(phone.value, props.purpose)
    } catch {
      return
    }
    await waitForCall()
  }

  /** Ждём подтверждения: промис резолвится токеном, реджектится на `expired`/`failed`. */
  async function waitForCall (): Promise<void> {
    try {
      const verification = await call.awaitVerification()
      emitVerified(verification.verificationToken)
    } catch {
      // Причина уже в сторе (`call.state`, `call.reason`).
    }
  }

  async function restartCall (): Promise<void> {
    try {
      await call.restart()
    } catch {
      return
    }
    await waitForCall()
  }

  /**
   * Резервный путь, обещанный контрактом (`otpFallback`): вместо звонка просим SMS
   * тем же номером. Челлендж звонка вытесняется — бэкенд держит один активный на
   * `(target, purpose)`.
   */
  async function switchToOtp (): Promise<void> {
    call.reset()
    delivery.value = 'otp'
    await send()
  }

  function changePhone (): void {
    otp.reset()
    call.reset()
    code.value = ''
  }

  onBeforeUnmount(() => {
    otp.reset()
    call.reset()
  })
</script>

<template>
  <div class="space-y-4">
    <Alert v-if="otp.error || call.error" density="compact" kind="error">
      {{ otp.error ?? call.error }}
    </Alert>
    <Alert v-if="otp.status === 'alreadyExists' || call.state === 'alreadyExists'" density="compact" kind="info">
      Номер уже зарегистрирован — войдите по телефону на странице входа.
    </Alert>
    <Alert v-if="otp.status === 'locked'" density="compact" kind="warning">
      Попытки исчерпаны. Запросите новый код.
    </Alert>

    <!-- Шаг 1: номер, канал подтверждения, согласие -->
    <template v-if="step === 'phone'">
      <PhoneInput
        v-model="phone"
        :disabled="isBusy || disabled"
        label="Телефон"
        required
      />

      <div aria-label="Способ подтверждения" class="flex gap-2" role="radiogroup">
        <Button
          :aria-pressed="delivery === 'otp'"
          :disabled="isBusy || disabled"
          size="sm"
          :variant="delivery === 'otp' ? 'tonal' : 'text'"
          @click="delivery = 'otp'"
        >
          Код из SMS
        </Button>
        <Button
          :aria-pressed="delivery === 'call'"
          :disabled="isBusy || disabled"
          size="sm"
          :variant="delivery === 'call' ? 'tonal' : 'text'"
          @click="delivery = 'call'"
        >
          Обратный звонок
        </Button>
      </div>

      <Checkbox v-if="requireTerms" v-model="acceptedTerms">
        <span>Принимаю условия использования и обработку персональных данных</span>
      </Checkbox>

      <Button
        :disabled="!canSend"
        :loading="isBusy"
        variant="brand"
        @click="delivery === 'call' ? startCall() : send()"
      >
        {{ delivery === 'call' ? 'Позвонить' : submitLabel }}
      </Button>
    </template>

    <!-- Шаг 2а: ввод кода из SMS -->
    <template v-else-if="step === 'otp'">
      <p class="text-sm text-muted-foreground">
        Код отправлен на <span class="font-medium">{{ otp.challenge?.target }}</span>.
        <button class="text-brand underline" type="button" @click="changePhone">
          Изменить номер
        </button>
      </p>

      <OtpInput
        v-model="code"
        :disabled="isBusy || disabled"
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

      <div class="flex flex-wrap gap-2">
        <Button
          :disabled="!canVerify"
          :loading="isBusy"
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
      </div>
    </template>

    <!-- Шаг 2б: ждём звонок (статус приходит опросом, вводить нечего) -->
    <template v-else>
      <p class="text-sm">
        Позвоните с номера <span class="font-medium">{{ phone }}</span> на
        <a class="text-brand underline" :href="callTel">{{ call.challenge?.callTo }}</a>
        — подтвердим автоматически, код вводить не нужно.
      </p>

      <p class="text-xs text-muted-foreground">
        <template v-if="call.state === 'failed'">
          Не получилось подтвердить: {{ call.reason ?? 'причина неизвестна' }}.
        </template>
        <template v-else-if="call.state === 'expired'">
          Окно звонка истекло (5 минут) — позвоните снова.
        </template>
        <template v-else-if="call.state === 'error'">
          Не удалось получить статус звонка. Попробуйте ещё раз.
        </template>
        <template v-else>
          Ждём звонок… осталось {{ call.expiresInLeft }} с.
        </template>
      </p>

      <div class="flex flex-wrap gap-2">
        <Button
          v-if="call.canRestart"
          variant="brand"
          @click="restartCall"
        >
          Позвонить снова
        </Button>
        <Button
          :disabled="disabled"
          variant="outlined"
          @click="switchToOtp"
        >
          Получить код вместо звонка
        </Button>
      </div>
    </template>
  </div>
</template>
