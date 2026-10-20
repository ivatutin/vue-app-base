<script setup lang="ts">
/**
 * Профиль пользователя: имя и фамилия.
 *
 * Контакты (email/телефон) здесь **не** меняются: смена контакта — чувствительная
 * операция с подтверждением кодами и reauth, она живёт в `/account/security`.
 *
 * Поля необязательные: пустая строка уходит на бэкенд как `null` (очистка), а
 * «Сохранить» неактивна, пока значения совпадают с профилем — лишний `PATCH`
 * (и лишняя запись `updatedAt`) не нужен.
 *
 * **Права (контракт v1.6, 20.10.2026):** `PATCH /users/me/profile` — self-service, доступен
 * любому аутентифицированному, пишет в Keycloak **и** shadow-БД. Поэтому форма открыта всем;
 * админский `PATCH /users/:id/profile` остаётся на бэкенде для чужих профилей.
 */
  import { useNotificationStore } from '@/entities/notification'
  import { useUserStore } from '@/entities/user'
  import { getErrorMessage } from '@/shared/api'
  import { Alert, Button, Card, Form, PageHeader, Spacer, TextField } from '@/shared/ui/base'

  definePage({
    meta: {
      title: 'Профиль',
    },
  })

  const userStore = useUserStore()
  const notification = useNotificationStore()

  const profile = computed(() => userStore.user)

  const firstName = ref(profile.value?.firstName ?? '')
  const lastName = ref(profile.value?.lastName ?? '')
  const error = ref<string | null>(null)
  const saving = ref(false)

  const changed = computed(() =>
    firstName.value.trim() !== (profile.value?.firstName ?? '')
    || lastName.value.trim() !== (profile.value?.lastName ?? ''),
  )

  const canSave = computed(() => !saving.value && changed.value)

  async function submit (): Promise<void> {
    if (!canSave.value) {
      return
    }

    error.value = null
    saving.value = true

    try {
      await userStore.updateProfile({
        firstName: firstName.value.trim() || null,
        lastName: lastName.value.trim() || null,
      })
      notification.push({ kind: 'success', message: 'Профиль обновлён' })
    } catch (error_) {
      error.value = getErrorMessage(error_)
    } finally {
      saving.value = false
    }
  }
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <PageHeader
      description="Имя и фамилия, которые видят другие пользователи."
      title="Профиль"
    />

    <Form @submit="submit">
      <Card title="Личные данные">
        <Alert v-if="error" class="mb-4" density="compact" kind="error">
          {{ error }}
        </Alert>

        <div class="space-y-4">
          <TextField
            v-model="firstName"
            autocomplete="given-name"
            :disabled="saving"
            label="Имя"
            maxlength="100"
          />
          <TextField
            v-model="lastName"
            autocomplete="family-name"
            :disabled="saving"
            label="Фамилия"
            maxlength="100"
          />
        </div>

        <template #footer>
          <span class="text-xs text-muted-foreground">
            Оба поля необязательные.
          </span>
          <Spacer />
          <Button :disabled="!canSave" :loading="saving" type="submit" variant="brand">
            Сохранить
          </Button>
        </template>
      </Card>
    </Form>

    <Card title="Контакты">
      <dl class="space-y-2 text-sm">
        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-muted-foreground">
            E-mail
          </dt>
          <dd class="text-right">
            {{ profile?.email ?? '—' }}
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-muted-foreground">
            Телефон
          </dt>
          <dd class="text-right">
            {{ profile?.phone ?? '—' }}
          </dd>
        </div>
      </dl>

      <template #footer>
        <span class="text-xs text-muted-foreground">
          Смена контакта требует подтверждения кодами — в разделе «Безопасность».
        </span>
        <Spacer />
        <RouterLink class="text-sm text-brand underline" :to="{ name: '/account/security' }">
          Безопасность
        </RouterLink>
      </template>
    </Card>
  </div>
</template>
