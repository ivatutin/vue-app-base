<script setup lang="ts">
/**
 * Смена контакта (email или телефон) — Phase 4, контракт v1.3.
 *
 * Три стадии, все в `useContactChangeStore` (страница токен не хранит):
 * 1. `idle` — канал, новое значение, **текущий пароль**: `contact-change/request` требует
 *    `X-Reauth-Token`, поэтому сначала `reauth` (`requestContactChangeFlow`).
 * 2. `codes` — вводим код на новое значение; если `requiresOldChallenge` (email), то и код
 *    на прежний контакт. Перевыпуск кода — только `Отменить` → снова запросить (контракт:
 *    повторный `request` даёт `422 ContactChangeAlreadyPending`).
 * 3. `done` — контакт применён, доступ **отозван**: сессия уже сброшена, остаётся войти
 *    заново новым контактом.
 *
 * `503` на `verify` = «ничего не применено, `changeToken` жив» — показываем ошибку и
 * оставляем пользователя на стадии кодов: повтор безопасен.
 */
  import { type ContactChannel, useContactChangeStore } from '@/entities/contact-change'
  import { useUserStore } from '@/entities/user'
  import {
    cancelContactChangeFlow,
    requestContactChangeFlow,
    verifyContactChangeFlow,
  } from '@/processes/auth-flow'
  import { ErrorCode, getErrorMessage, matchError } from '@/shared/api'
  import { emailSchema } from '@/shared/model/credentials'
  import { phoneSchema } from '@/shared/model/phone'
  import {
    Alert,
    Button,
    Card,
    Divider,
    OtpInput,
    PasswordInput,
    PhoneInput,
    Spacer,
    TextField,
  } from '@/shared/ui/base'

  const userStore = useUserStore()
  const store = useContactChangeStore()
  const router = useRouter()

  const channel = ref<ContactChannel>('email')
  const email = ref('')
  const phone = ref('')
  const currentPassword = ref('')
  const oldCode = ref('')
  const newCode = ref('')
  const error = ref<string | null>(null)
  const submitting = ref(false)

  const profile = computed(() => userStore.user)

  /** Что меняем сейчас — для подписи «код на текущий …». */
  const currentContact = computed(() =>
    channel.value === 'email' ? profile.value?.email : profile.value?.phone,
  )

  const newValue = computed(() => (channel.value === 'email' ? email.value.trim() : phone.value))

  const newValueValid = computed(() => (channel.value === 'email'
    ? emailSchema.safeParse(newValue.value).success
    : phoneSchema.safeParse(newValue.value).success))

  const canRequest = computed(
    () => !submitting.value && currentPassword.value.length > 0 && newValueValid.value,
  )

  const canVerify = computed(
    () => !submitting.value
      && newCode.value.length > 0
      && (!store.requiresOldChallenge || oldCode.value.length > 0),
  )

  /**
   * `ContactChangeAlreadyPending` здесь значит «предыдущий экземпляр смены ещё жив, а токен
   * мы не знаем» (перезагрузка страницы): отменить нечего, честно просим завершить/подождать.
   * `ContactAlreadyExists` приходит как `409` и уже имеет свой текст в `getErrorMessage`.
   */
  function describeError (error_: unknown): string {
    return matchError(error_, ErrorCode.CONTACT_CHANGE_ALREADY_PENDING)
      ? 'На аккаунте уже есть незавершённая смена контакта. Отмените её или дождитесь истечения (15 минут).'
      : getErrorMessage(error_)
  }

  async function request (): Promise<void> {
    if (!canRequest.value) {
      return
    }

    error.value = null
    submitting.value = true

    try {
      await requestContactChangeFlow({
        currentPassword: currentPassword.value,
        channel: channel.value,
        newValue: newValue.value,
      })
      // Пароль и коды — одноразовые: в памяти формы не остаются.
      currentPassword.value = ''
      oldCode.value = ''
      newCode.value = ''
    } catch (error_) {
      error.value = describeError(error_)
    } finally {
      submitting.value = false
    }
  }

  async function verify (): Promise<void> {
    if (!canVerify.value) {
      return
    }

    error.value = null
    submitting.value = true

    try {
      await verifyContactChangeFlow({
        newCode: newCode.value,
        ...(store.requiresOldChallenge ? { oldCode: oldCode.value } : {}),
      })
      // Доступ уже отозван — на экран «Вы вышли»: там же подтверждение и вход заново.
      await router.replace({ name: '/auth/logout' })
    } catch (error_) {
      error.value = describeError(error_)
    } finally {
      submitting.value = false
    }
  }

  async function cancel (): Promise<void> {
    error.value = null
    submitting.value = true

    try {
      await cancelContactChangeFlow()
      oldCode.value = ''
      newCode.value = ''
    } catch (error_) {
      error.value = describeError(error_)
    } finally {
      submitting.value = false
    }
  }

  function goToLogin (): void {
    void router.replace({ name: '/auth/logout' })
  }
</script>

<template>
  <Card title="Контакт">
    <Alert v-if="error" class="mb-4" density="compact" kind="error">
      {{ error }}
    </Alert>

    <!-- 3. Готово: доступ отозван, остаётся войти заново -->
    <p v-if="store.isDone" class="text-sm">
      Контакт <span class="font-medium">{{ store.newValue }}</span> подтверждён и сохранён.
      Все сессии завершены — войдите заново уже с новым контактом.
    </p>

    <!-- 2. Коды -->
    <div v-else-if="store.isPending" class="space-y-4">
      <p class="text-sm text-muted-foreground">
        Код отправлен на <span class="font-medium">{{ store.newValue }}</span>.
      </p>

      <template v-if="store.requiresOldChallenge">
        <p class="text-sm text-muted-foreground">
          Подтвердите и текущий контакт: код придёт на
          <span class="font-medium">{{ currentContact ?? 'прежний контакт' }}</span>.
        </p>
        <OtpInput v-model="oldCode" :disabled="submitting" />
      </template>

      <p class="text-sm">
        Код на новый контакт
      </p>
      <OtpInput v-model="newCode" :disabled="submitting" />
    </div>

    <!-- 1. Запрос -->
    <div v-else class="space-y-4">
      <div aria-label="Что меняем" class="flex gap-2" role="radiogroup">
        <Button
          :aria-pressed="channel === 'email'"
          :disabled="submitting"
          size="sm"
          :variant="channel === 'email' ? 'tonal' : 'text'"
          @click="channel = 'email'"
        >
          E-mail
        </Button>
        <Button
          :aria-pressed="channel === 'phone'"
          :disabled="submitting"
          size="sm"
          :variant="channel === 'phone' ? 'tonal' : 'text'"
          @click="channel = 'phone'"
        >
          Телефон
        </Button>
      </div>

      <TextField
        v-if="channel === 'email'"
        v-model="email"
        autocomplete="email"
        :disabled="submitting"
        label="Новый e-mail"
        type="email"
      />
      <PhoneInput v-else v-model="phone" :disabled="submitting" label="Новый телефон" />

      <Divider />

      <p class="text-sm text-muted-foreground">
        Смена контакта — защищённая операция: подтвердите пароль, он нужен только для неё
        и нигде не сохраняется.
      </p>

      <PasswordInput
        v-model="currentPassword"
        autocomplete="current-password"
        :disabled="submitting"
        label="Текущий пароль"
      />

      <p class="text-xs text-muted-foreground">
        После подтверждения придётся войти заново: бэкенд завершает все сессии.
      </p>
    </div>

    <template #footer>
      <template v-if="store.isDone">
        <Spacer />
        <Button variant="brand" @click="goToLogin">
          Войти заново
        </Button>
      </template>

      <template v-else-if="store.isPending">
        <span class="text-xs text-muted-foreground">Код действует ограниченное время.</span>
        <Spacer />
        <Button :disabled="submitting" variant="text" @click="cancel">
          Отменить
        </Button>
        <Button :disabled="!canVerify" :loading="submitting" variant="brand" @click="verify">
          Подтвердить
        </Button>
      </template>

      <template v-else>
        <span class="text-xs text-muted-foreground">Код придёт на новое значение.</span>
        <Spacer />
        <Button :disabled="!canRequest" :loading="submitting" variant="brand" @click="request">
          Отправить код
        </Button>
      </template>
    </template>
  </Card>
</template>
