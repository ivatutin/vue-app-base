<script setup lang="ts">
/**
 * Регистрация: табы «E-mail» / «Телефон».
 *
 * Phase 1 — рабочий email-таб (аккаунт с паролем + обязательное согласие с условиями);
 * phone-таб включается в Phase 2 (OTP → `sign-up/phone`) и пока `disabled`, чтобы не
 * создавать ложного впечатления работающей вкладки.
 *
 * Токенов `sign-up/email` не отдаёт (вариант A, 16.10.2026): после успеха уводим на
 * `/auth/verify-email`. `409 ContactAlreadyExists` — не ошибка формы: по тому же
 * решению ведём на экран подтверждения, где есть кнопка resend.
 *
 * `PasswordPolicyViolation` показываем **своим** текстом: в `details.message` приходит
 * ключ Keycloak (`invalidPasswordMinLengthMessage`), а не готовая фраза.
 */
  import { z } from 'zod'
  import { registerEmailFlow, registerPhoneFlow } from '@/processes/auth-flow'
  import { classifyFailure, ErrorCode, getErrorMessage, matchError } from '@/shared/api'
  import { emailSchema, passwordSchema } from '@/shared/model/credentials'
  import {
    Alert,
    Button,
    Card,
    Checkbox,
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
      title: 'Регистрация',
    },
  })

  const router = useRouter()

  const tab = ref('email')
  const error = ref<string | null>(null)
  const loading = ref(false)

  const registerSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    acceptedTerms: z.literal(true),
    /**
     * Необязательные: контракт допускает `firstName`/`lastName` в `sign-up/email`.
     * Нужны, потому что реалм требует имя/фамилию у роли `user` (иначе Keycloak
     * доспрашивает их после подтверждения, а shadow-БД остаётся с `null`).
     */
    firstName: z.string().trim().max(100).optional(),
    lastName: z.string().trim().max(100).optional(),
  })

  type RegisterValues = z.infer<typeof registerSchema>

  const formRef = ref<{ setFieldError: (field: string, message: string) => void } | null>(null)

  /**
   * Таймаут регистрации — особый случай ([ADR-0016](../../../../docs/adr/0016-failure-classification-and-bootstrap-outcomes.md),
   * ревизия 2): вызов неидемпотентный, бэкенд мог довести операцию после обрыва. Поэтому не предлагаем
   * «повторить», а отправляем войти — ссылка «Войти» уже есть в футере формы.
   */
  function describeRegisterFailure (err: unknown): string {
    return classifyFailure(err) === 'timeout'
      ? 'Не дождались ответа от сервера. Аккаунт мог быть создан — попробуйте войти.'
      : getErrorMessage(err)
  }

  async function onSubmit (values: RegisterValues): Promise<void> {
    // Повторный Enter во время запроса: sign-up неидемпотентен, двойная отправка
    // вернула бы 409 про собственный же аккаунт.
    if (loading.value) {
      return
    }

    error.value = null
    loading.value = true

    try {
      await registerEmailFlow({
        ...values,
        // Пустая строка → `undefined`: DTO не принимает `''` (`min(1)`).
        firstName: values.firstName?.trim() || undefined,
        lastName: values.lastName?.trim() || undefined,
      })
      await router.push({ name: '/auth/verify-email' })
    } catch (error_) {
      if (matchError(error_, ErrorCode.CONTACT_ALREADY_EXISTS)) {
        await router.push({ name: '/auth/verify-email' })
        return
      }

      if (matchError(error_, ErrorCode.PASSWORD_POLICY_VIOLATION)) {
        formRef.value?.setFieldError(
          'password',
          'Пароль не соответствует требованиям: не короче 10 символов, не совпадает с логином и e-mail',
        )
        return
      }

      if (matchError(error_, ErrorCode.TERMS_NOT_ACCEPTED)) {
        formRef.value?.setFieldError('acceptedTerms', 'Отметьте согласие с условиями')
        return
      }

      error.value = describeRegisterFailure(error_)
    } finally {
      loading.value = false
    }
  }

  /**
   * Телефонный шаг: виджет уже подтвердил номер и отдал `verificationToken`.
   * `sign-up/phone` сразу логинит — уводим на дашборд; `409` (гонка: номер заняли
   * между OTP и созданием) объясняем текстом, остальное — по реестру кодов.
   */
  async function onPhoneVerified (payload: {
    phone: string
    verificationToken: string
    acceptedTerms: boolean
  }): Promise<void> {
    if (loading.value) {
      return
    }

    error.value = null
    loading.value = true

    try {
      await registerPhoneFlow(payload)
      await router.push({ name: '/dashboard' })
    } catch (error_) {
      error.value = matchError(error_, ErrorCode.CONTACT_ALREADY_EXISTS)
        ? 'Номер уже зарегистрирован — войдите по телефону.'
        : describeRegisterFailure(error_)
    } finally {
      loading.value = false
    }
  }
</script>

<template>
  <Form ref="formRef" :schema="registerSchema" @submit="onSubmit">
    <Card title="Регистрация" width="100%">
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
            autocomplete="email"
            :disabled="loading"
            label="E-mail"
            name="email"
            required
            type="email"
          />
          <PasswordInput
            autocomplete="new-password"
            :disabled="loading"
            label="Пароль"
            name="password"
            required
            show-strength
          />
          <div class="grid gap-4 sm:grid-cols-2">
            <TextField
              autocomplete="given-name"
              :disabled="loading"
              label="Имя (необязательно)"
              maxlength="100"
              name="firstName"
            />
            <TextField
              autocomplete="family-name"
              :disabled="loading"
              label="Фамилия (необязательно)"
              maxlength="100"
              name="lastName"
            />
          </div>
          <Checkbox name="acceptedTerms">
            <span>Принимаю условия использования и обработку персональных данных</span>
          </Checkbox>
        </TabsContent>

        <TabsContent value="phone">
          <PhoneVerificationForm
            :disabled="loading"
            :pending="loading"
            purpose="sign-up"
            require-terms
            submit-label="Создать аккаунт"
            @verified="onPhoneVerified"
          />
        </TabsContent>
      </Tabs>

      <template #footer>
        <span class="text-sm text-muted-foreground">
          Уже есть аккаунт?
          <RouterLink class="text-brand underline" :to="{ name: '/auth/login' }">Войти</RouterLink>
        </span>
        <Spacer />
        <Button :disabled="tab !== 'email'" :loading="loading" type="submit" variant="brand">
          Создать аккаунт
        </Button>
      </template>
    </Card>
  </Form>
</template>
