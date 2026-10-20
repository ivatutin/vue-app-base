<script setup lang="ts">
/**
 * «Проверьте почту» — статичный экран (вариант A, 16.10.2026).
 *
 * Polling невозможен: `sign-up/email` не отдаёт токенов, а `GET /users/me` protected;
 * ссылка из письма ведёт на страницу Keycloak и в приложение не возвращает — поэтому
 * маршрут не принимает параметров и не «ждёт» подтверждения. Подтверждение пользователь
 * увидит попыткой входа.
 *
 * Адрес берём из `registration-store` (память вкладки). После перезагрузки его там нет —
 * тогда показываем поле ввода: оно нужно только для повторной отправки письма.
 *
 * Срок действия ссылки не обещаем числом: админский action-token живёт 12 часов, но
 * конкретное значение зависит от реалма — «ограниченное время» честнее.
 */
  import { maskEmail, useRegistrationStore } from '@/entities/auth'
  import { resendVerifyEmailFlow } from '@/processes/auth-flow'
  import { getErrorMessage } from '@/shared/api'
  import { emailSchema } from '@/shared/model/credentials'
  import { Alert, Button, Card, Spacer, TextField } from '@/shared/ui/base'

  definePage({
    meta: {
      noAuth: true,
      layout: 'auth',
      title: 'Подтверждение почты',
    },
  })

  const registration = useRegistrationStore()
  const { pendingEmail, verifyEmailSent, alreadyRegistered } = storeToRefs(registration)

  const manualEmail = ref('')
  const resent = ref(false)
  const error = ref<string | null>(null)
  const loading = ref(false)

  const masked = computed(() => (pendingEmail.value ? maskEmail(pendingEmail.value) : null))
  const needsManualEmail = computed(() => pendingEmail.value === null)
  const canResend = computed(() => !loading.value
    && (needsManualEmail.value ? emailSchema.safeParse(manualEmail.value).success : true))

  async function resend (): Promise<void> {
    if (!canResend.value) {
      return
    }

    error.value = null
    resent.value = false
    loading.value = true

    try {
      await resendVerifyEmailFlow(needsManualEmail.value ? manualEmail.value : undefined)
      resent.value = true
    } catch (error_) {
      error.value = getErrorMessage(error_)
    } finally {
      loading.value = false
    }
  }
</script>

<template>
  <Card title="Проверьте почту" width="100%">
    <div class="space-y-4">
      <Alert v-if="alreadyRegistered" density="compact" kind="info">
        Аккаунт с таким адресом уже есть, но адрес не подтверждён. Нажмите «Отправить ещё раз» — придёт новое письмо.
      </Alert>

      <p class="text-sm">
        Мы отправили письмо<template v-if="masked"> на <span class="font-medium">{{ masked }}</span></template>.
        Откройте ссылку в письме — она подтвердит адрес.
      </p>

      <Alert v-if="verifyEmailSent === false && !resent" density="compact" kind="warning">
        Похоже, письмо не ушло. Нажмите «Отправить ещё раз» — и проверьте адрес, если он введён неверно.
      </Alert>

      <Alert v-if="resent" density="compact" kind="success">
        Письмо отправлено повторно.
      </Alert>

      <template v-if="needsManualEmail">
        <TextField
          v-model="manualEmail"
          autocomplete="email"
          :disabled="loading"
          label="E-mail для повторной отправки"
          type="email"
        />
        <p class="text-xs text-muted-foreground">
          Адрес живёт только в этой вкладке: после перезагрузки введите его ещё раз, чтобы отправить письмо повторно.
        </p>
      </template>

      <Alert v-if="error" density="compact" kind="error">
        {{ error }}
      </Alert>

      <p class="text-xs text-muted-foreground">
        Ссылка действует ограниченное время. Если письма нет — проверьте папку «Спам».
      </p>
    </div>

    <template #footer>
      <RouterLink class="text-sm text-brand underline" :to="{ name: '/auth/login' }">
        Войти
      </RouterLink>
      <Spacer />
      <Button :disabled="!canResend" :loading="loading" variant="brand" @click="resend">
        Отправить ещё раз
      </Button>
    </template>
  </Card>
</template>
