<script setup lang="ts">
  import { useAuthStore } from '@/entities/auth'
  import { useUserStore } from '@/entities/user'

  definePage({
    meta: {
      noAuth: true,
      layout: 'auth',
    },
  })

  const auth = useAuthStore()
  const user = useUserStore()
  const router = useRouter()

  onMounted(async () => {
    try {
      await auth.logout()
    } finally {
      user.reset()
    }
  })

  function goToLogin () {
    router.replace({ name: '/auth/login' })
  }
</script>

<template>
  <v-card width="100%">
    <v-card-title>Вы вышли</v-card-title>
    <v-card-text>Сессия завершена.</v-card-text>
    <v-divider />
    <v-card-actions>
      <v-spacer />
      <v-btn color="primary" variant="elevated" @click="goToLogin">Войти снова</v-btn>
    </v-card-actions>
  </v-card>
</template>
