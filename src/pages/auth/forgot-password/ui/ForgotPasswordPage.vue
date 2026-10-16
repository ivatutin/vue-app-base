<script setup lang="ts">
/**
 * «Забыли пароль» — один экран, два состояния: форма и «Письмо отправлено».
 *
 * Anti-enumeration: бэкенд отвечает `202` всегда, поэтому в состоянии «отправлено»
 * мы не подтверждаем и не опровергаем существование аккаунта — формулировка
 * «если адрес зарегистрирован, письмо уже отправлено».
 *
 * Своей формы нового пароля нет: ссылка ведёт на страницу Keycloak (required action
 * `UPDATE_PASSWORD`). Возврат в приложение (для тоста на логине) зависит от
 * `redirect_uri` в письме — сегодня его нет, но обработчик на логине уже ждёт.
 */
  import { maskEmail } from '@/entities/auth'
  import { forgotPasswordFlow } from '@/processes/auth-flow'
  import { getErrorMessage } from '@/shared/api'
  import { emailSchema } from '@/shared/model/credentials'
  import { Alert, Button, Card, Form, Spacer, TextField } from '@/shared/ui/base'

  definePage({
    meta: {
      noAuth: true,
      layout: 'auth',
      title: 'Восстановление пароля',
    },
  })

  const email = ref('')
  const sent = ref(false)
  const error = ref<string | null>(null)
  const loading = ref(false)

  const masked = computed(() => (email.value ? maskEmail(email.value) : null))
  const canSubmit = computed(() => !loading.value && emailSchema.safeParse(email.value).success)

  async function submit (): Promise<void> {
    if (!canSubmit.value) {
      return
    }

    error.value = null
    loading.value = true

    try {
      await forgotPasswordFlow(email.value)
      sent.value = true
    } catch (error_) {
      error.value = getErrorMessage(error_)
    } finally {
      loading.value = false
    }
  }

  /** Вернуться к форме: адрес остаётся, чтобы не набирать заново. */
  function editEmail (): void {
    sent.value = false
    error.value = null
  }
</script>

<template>
  <Form @submit="submit">
    <Card :title="sent ? 'Письмо отправлено' : 'Восстановление пароля'" width="100%">
      <template v-if="!sent">
        <Alert v-if="error" class="mb-4" density="compact" kind="error">
          {{ error }}
        </Alert>

        <p class="mb-4 text-sm text-muted-foreground">
          Укажите e-mail, на который зарегистрирован аккаунт — пришлём ссылку для установки нового пароля.
        </p>

        <TextField
          v-model="email"
          autocomplete="email"
          :disabled="loading"
          label="E-mail"
          required
          type="email"
        />
      </template>

      <template v-else>
        <p class="text-sm">
          Если адрес <span class="font-medium">{{ masked }}</span> зарегистрирован, письмо со ссылкой уже отправлено.
          Откройте его и задайте новый пароль — ссылка действует ограниченное время.
        </p>
        <button
          class="mt-3 text-sm text-brand underline"
          type="button"
          @click="editEmail"
        >
          Изменить адрес
        </button>
      </template>

      <template #footer>
        <RouterLink class="text-sm text-muted-foreground underline" :to="{ name: '/auth/login' }">
          Вернуться к входу
        </RouterLink>
        <Spacer />
        <Button
          v-if="!sent"
          :disabled="!canSubmit"
          :loading="loading"
          type="submit"
          variant="brand"
        >
          Отправить ссылку
        </Button>
      </template>
    </Card>
  </Form>
</template>
