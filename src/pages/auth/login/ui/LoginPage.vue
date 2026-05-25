<script setup lang="ts">
import { useAuthStore } from '@/entities/auth'
import { useUserStore } from '@/entities/user'
import { HttpError } from '@/shared/api'

definePage({
  meta: {
    noAuth: true,
    layout: 'auth',
  },
})

const auth = useAuthStore()
const user = useUserStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function submit() {
  error.value = null
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    await user.fetchCurrentUser()
    await router.replace({ name: '/dashboard' })
  } catch (err) {
    error.value = err instanceof HttpError ? err.message : 'Не удалось войти'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <v-card width="100%">
    <v-card-title>Вход</v-card-title>
    <v-form @submit.prevent="submit">
      <v-card-text>
        <v-alert
          v-if="error"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          {{ error }}
        </v-alert>
        <v-text-field
          v-model="email"
          label="E-mail"
          type="email"
          autocomplete="email"
          required
          :disabled="loading"
        />
        <v-text-field
          v-model="password"
          label="Пароль"
          type="password"
          autocomplete="current-password"
          required
          :disabled="loading"
        />
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn
          type="submit"
          color="primary"
          variant="elevated"
          :loading="loading"
          :disabled="!email || !password"
        >
          Войти
        </v-btn>
      </v-card-actions>
    </v-form>
  </v-card>
</template>
