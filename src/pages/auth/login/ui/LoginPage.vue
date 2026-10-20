<script setup lang="ts">
  import { useNotificationStore } from '@/entities/notification'
  import { loginFlow, loginPhoneFlow } from '@/processes/auth-flow'
  import { getErrorMessage, HttpError } from '@/shared/api'
  import {
    Alert,
    Button,
    Card,
    Form,
    PasswordInput,
    Spacer,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    TextField,
  } from '@/shared/ui/base'
  import { PhoneVerificationForm } from '@/widgets/phone-verification'

  definePage({
    meta: {
      noAuth: true,
      layout: 'auth',
    },
  })

  const router = useRouter()
  const route = useRoute()
  const notification = useNotificationStore()

  const tab = ref('email')
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
      // Текст берём из реестра кодов, а не из `HttpError.message`: в сообщении сервера
      // приходит английская строка (`Invalid credentials`), которую нельзя показывать.
      error.value = getErrorMessage(error_)
    } finally {
      loading.value = false
    }
  }

  /**
   * Телефонный вход: виджет уже подтвердил номер, `sign-in/phone` отдаёт токены.
   * Anti-enumeration: незарегистрированный номер приходит как `401 InvalidCredentials`
   * — показываем единый текст, как и для неверного кода.
   */
  async function onPhoneVerified (payload: { phone: string, verificationToken: string }): Promise<void> {
    error.value = null
    loading.value = true

    try {
      await loginPhoneFlow(payload.phone, payload.verificationToken)
      await router.replace({ name: '/dashboard' })
    } catch (error_) {
      error.value = error_ instanceof HttpError && error_.status === 401
        ? 'Не удалось войти по этому номеру'
        : 'Не удалось войти'
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

      <Tabs v-model="tab">
        <TabsList class="mb-4">
          <TabsTrigger value="email">E-mail</TabsTrigger>
          <TabsTrigger value="phone">Телефон</TabsTrigger>
        </TabsList>

        <TabsContent class="space-y-4" value="email">
          <TextField
            v-model="email"
            autocomplete="email"
            :disabled="loading"
            label="E-mail"
            required
            type="email"
          />
          <PasswordInput
            v-model="password"
            autocomplete="current-password"
            :disabled="loading"
            label="Пароль"
            required
          />
        </TabsContent>

        <TabsContent value="phone">
          <PhoneVerificationForm
            :disabled="loading"
            purpose="sign-in"
            @verified="onPhoneVerified"
          />
        </TabsContent>
      </Tabs>
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
          v-if="tab === 'email'"
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
