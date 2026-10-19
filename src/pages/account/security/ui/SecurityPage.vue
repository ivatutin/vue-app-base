<script setup lang="ts">
/**
 * Безопасность аккаунта: пароль и активные сессии.
 *
 * **Пароль, два режима.** По `UserDto` нельзя узнать, есть ли у аккаунта пароль
 * (`hasPassword` в контракте нет), поэтому выбор даёт пользователь:
 * - «сменить» — `reauth` текущим паролем + новый (`changePasswordFlow`);
 * - «задать» — аккаунт без пароля (phone sign-up): OTP с `purpose: 'set-password'`
 *   на **свой** номер из профиля (в виджете номер заблокирован — чужой токен бэкенд
 *   отвергает), затем `setPasswordFlow`.
 *
 * **Сессии.** «Выйти на всех устройствах» → `logoutAllFlow`: сначала серверный отзыв,
 * только потом локальная очистка. `503` = не отозвано ничего → сессия остаётся,
 * показываем ошибку (handover/logout-all-frontend.md).
 *
 * Смена контакта (email/телефон) — отдельный блок ниже: там своя механика с кодами.
 */
  import { useNotificationStore } from '@/entities/notification'
  import { useUserStore } from '@/entities/user'
  import { changePasswordFlow, logoutAllFlow, setPasswordFlow } from '@/processes/auth-flow'
  import { ErrorCode, getErrorMessage, matchError } from '@/shared/api'
  import { passwordSchema } from '@/shared/model/credentials'
  import {
    Alert,
    Button,
    Card,
    Divider,
    Form,
    PageHeader,
    PasswordInput,
    Spacer,
  } from '@/shared/ui/base'
  import { PhoneVerificationForm } from '@/widgets/phone-verification'

  definePage({
    meta: {
      title: 'Безопасность',
    },
  })

  const userStore = useUserStore()
  const notification = useNotificationStore()
  const router = useRouter()

  const profile = computed(() => userStore.user)
  const phone = computed(() => profile.value?.phone ?? null)

  const mode = ref<'change' | 'set'>('change')

  const currentPassword = ref('')
  const newPassword = ref('')
  const confirmPassword = ref('')
  const formError = ref<string | null>(null)
  const submitting = ref(false)
  /** Растёт после успеха: пересоздаёт виджет, его сторы очищаются в `onBeforeUnmount`. */
  const verificationKey = ref(0)

  const passwordOk = computed(() => passwordSchema.safeParse(newPassword.value).success)
  const passwordsMatch = computed(
    () => newPassword.value.length > 0 && newPassword.value === confirmPassword.value,
  )

  const canChange = computed(
    () => !submitting.value
      && currentPassword.value.length > 0
      && passwordOk.value
      && passwordsMatch.value,
  )

  const canSet = computed(() => !submitting.value && passwordOk.value && passwordsMatch.value)

  /**
   * В `details.message` при `PasswordPolicyViolation` приходит **ключ Keycloak**
   * (`invalidPasswordMinLengthMessage`), а не готовая фраза, — показываем свой текст
   * с политикой realm (`length(10) and notUsername and notEmail`).
   */
  function describeError (error_: unknown): string {
    return matchError(error_, ErrorCode.PASSWORD_POLICY_VIOLATION)
      ? 'Пароль не соответствует требованиям: не короче 10 символов, не совпадает с логином и e-mail'
      : getErrorMessage(error_)
  }

  function resetForm (): void {
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  }

  async function submitChange (): Promise<void> {
    if (!canChange.value) {
      return
    }

    formError.value = null
    submitting.value = true

    try {
      await changePasswordFlow(currentPassword.value, newPassword.value)
      notification.push({ kind: 'success', message: 'Пароль изменён' })
      resetForm()
    } catch (error_) {
      formError.value = describeError(error_)
    } finally {
      submitting.value = false
    }
  }

  /** Телефон подтверждён — одноразовый токен сразу меняем на пароль (в сторах не храним). */
  async function onPhoneVerified ({ verificationToken }: { verificationToken: string }): Promise<void> {
    if (!canSet.value) {
      formError.value = 'Сначала задайте новый пароль в полях выше.'
      return
    }

    formError.value = null
    submitting.value = true

    try {
      await setPasswordFlow(verificationToken, newPassword.value)
      notification.push({ kind: 'success', message: 'Пароль задан' })
      resetForm()
      verificationKey.value += 1
      mode.value = 'change'
    } catch (error_) {
      formError.value = describeError(error_)
    } finally {
      submitting.value = false
    }
  }

  const revoking = ref(false)
  const revokeError = ref<string | null>(null)

  async function revokeAll (): Promise<void> {
    if (revoking.value) {
      return
    }

    revokeError.value = null
    revoking.value = true

    try {
      await logoutAllFlow()
      // Локальной сессии уже нет: `/auth/logout` покажет «Вы вышли» и не станет
      // дёргать sign-out (refreshToken пуст).
      await router.replace({ name: '/auth/logout' })
    } catch (error_) {
      revokeError.value = getErrorMessage(error_)
      revoking.value = false
    }
  }
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <PageHeader
      description="Пароль и активные сессии вашего аккаунта."
      title="Безопасность"
    />

    <Form v-if="mode === 'change'" @submit="submitChange">
      <Card title="Пароль">
        <Alert v-if="formError" class="mb-4" density="compact" kind="error">
          {{ formError }}
        </Alert>

        <div class="space-y-4">
          <PasswordInput
            v-model="currentPassword"
            autocomplete="current-password"
            :disabled="submitting"
            label="Текущий пароль"
          />
          <PasswordInput
            v-model="newPassword"
            autocomplete="new-password"
            :disabled="submitting"
            label="Новый пароль"
            show-strength
          />
          <PasswordInput
            v-model="confirmPassword"
            autocomplete="new-password"
            :disabled="submitting"
            label="Повторите новый пароль"
          />
          <p class="text-xs text-muted-foreground">
            Не короче 10 символов, не совпадает с логином и e-mail.
          </p>
        </div>

        <template #footer>
          <button class="text-sm text-brand underline" type="button" @click="mode = 'set'">
            У меня ещё нет пароля
          </button>
          <Spacer />
          <Button :disabled="!canChange" :loading="submitting" type="submit" variant="brand">
            Сменить пароль
          </Button>
        </template>
      </Card>
    </Form>

    <Card v-else title="Задать пароль">
      <Alert v-if="formError" class="mb-4" density="compact" kind="error">
        {{ formError }}
      </Alert>

      <div class="space-y-4">
        <PasswordInput
          v-model="newPassword"
          autocomplete="new-password"
          :disabled="submitting"
          label="Новый пароль"
          show-strength
        />
        <PasswordInput
          v-model="confirmPassword"
          autocomplete="new-password"
          :disabled="submitting"
          label="Повторите новый пароль"
        />

        <Divider />

        <p class="text-sm text-muted-foreground">
          Подтвердите номер из профиля — код придёт на него.
          <template v-if="!phone">
            Телефон не привязан: сначала привяжите его в блоке «Контакт».
          </template>
        </p>

        <PhoneVerificationForm
          v-if="phone"
          :key="verificationKey"
          :disabled="!canSet"
          :initial-phone="phone"
          lock-phone
          purpose="set-password"
          submit-label="Получить код"
          @verified="onPhoneVerified"
        />
      </div>

      <template #footer>
        <button class="text-sm text-brand underline" type="button" @click="mode = 'change'">
          У меня уже есть пароль
        </button>
      </template>
    </Card>

    <Card title="Сессии">
      <p class="text-sm text-muted-foreground">
        Завершает вход на всех устройствах, включая это. После этого понадобится войти заново.
      </p>

      <Alert v-if="revokeError" class="mt-4" density="compact" kind="error">
        {{ revokeError }}
      </Alert>

      <template #footer>
        <Spacer />
        <Button :disabled="revoking" :loading="revoking" @click="revokeAll">
          Выйти на всех устройствах
        </Button>
      </template>
    </Card>
  </div>
</template>
