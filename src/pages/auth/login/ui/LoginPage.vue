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

  async function submit () {
    error.value = null
    loading.value = true
    try {
      await auth.login(email.value, password.value)
      await user.fetchCurrentUser()
      await router.replace({ name: '/dashboard' })
    } catch (error_) {
      error.value = error_ instanceof HttpError ? error_.message : 'Не удалось войти'
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
          class="mb-4"
          density="compact"
          type="error"
          variant="tonal"
        >
          {{ error }}
        </v-alert>
        <v-text-field
          v-model="email"
          autocomplete="email"
          :disabled="loading"
          label="E-mail"
          required
          type="email"
        />
        <v-text-field
          v-model="password"
          autocomplete="current-password"
          :disabled="loading"
          label="Пароль"
          required
          type="password"
        />
      </v-card-text>
      <v-divider />
      <v-card-actions>
        <v-spacer />
        <v-btn
          color="primary"
          :disabled="!email || !password"
          :loading="loading"
          type="submit"
          variant="elevated"
        >
          Войти
        </v-btn>
      </v-card-actions>
    </v-form>
  </v-card>
</template>
