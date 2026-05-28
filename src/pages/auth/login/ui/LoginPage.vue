<script setup lang="ts">
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

  const email = ref('')
  const password = ref('')
  const error = ref<string | null>(null)
  const loading = ref(false)

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
        <Spacer />
        <Button
          :disabled="!email || !password"
          :loading="loading"
          type="submit"
          variant="primary"
        >
          Войти
        </Button>
      </template>
    </Card>
  </Form>
</template>
