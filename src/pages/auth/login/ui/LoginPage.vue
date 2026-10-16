<script setup lang="ts">
  import { useNotificationStore } from '@/entities/notification'
  import { loginFlow } from '@/processes/auth-flow'
  import { HttpError } from '@/shared/api'
  import { Alert, Button, Card, Form, Spacer, TextField } from '@/shared/ui/base'

  definePage({
    meta: {
      noAuth: true,
      layout: 'auth',
    },
  })

  const router = useRouter()
  const route = useRoute()
  const notification = useNotificationStore()

  const email = ref('')
  const password = ref('')
  const error = ref<string | null>(null)
  const loading = ref(false)

  /**
   * Возврат после сброса пароля: подтверждаем тостом. Сегодня Keycloak показывает
   * свою страницу и в приложение не возвращает (`executeActionsEmail` идёт без
   * `client_id`/`redirect_uri`), поэтому параметр — задел на будущее; обработчик
   * заодно убирает `?reset` из URL, чтобы тост не повторялся при обновлении.
   */
  onMounted(() => {
    if (route.query.reset === 'success') {
      notification.push({ kind: 'success', message: 'Пароль обновлён. Войдите с новым паролем.' })
      void router.replace({ name: '/auth/login' })
    }
  })

  async function submit () {
    error.value = null
    loading.value = true
    try {
      await loginFlow(email.value, password.value)
      await router.replace({ name: '/dashboard' })
    } catch (error_) {
      error.value = error_ instanceof HttpError ? error_.message : 'Не удалось войти'
    } finally {
      loading.value = false
    }
  }
</script>

<template>
  <Form @submit="submit">
    <Card title="Вход" width="100%">
      <Alert v-if="error" class="mb-4" density="compact" kind="error">
        {{ error }}
      </Alert>
      <TextField
        v-model="email"
        autocomplete="email"
        :disabled="loading"
        label="E-mail"
        required
        type="email"
      />
      <TextField
        v-model="password"
        autocomplete="current-password"
        :disabled="loading"
        label="Пароль"
        required
        type="password"
      />
      <template #footer>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <RouterLink
            class="text-sm text-muted-foreground underline"
            :to="{ name: '/auth/forgot-password' }"
          >
            Забыли пароль?
          </RouterLink>
          <RouterLink
            class="text-sm text-muted-foreground underline"
            :to="{ name: '/auth/register' }"
          >
            Создать аккаунт
          </RouterLink>
        </div>
        <Spacer />
        <Button
          :disabled="!email || !password"
          :loading="loading"
          type="submit"
          variant="brand"
        >
          Войти
        </Button>
      </template>
    </Card>
  </Form>
</template>
