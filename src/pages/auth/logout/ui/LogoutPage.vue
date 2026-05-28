<script setup lang="ts">
  import { logoutFlow } from '@/processes/auth-flow'

  definePage({
    meta: {
      noAuth: true,
      layout: 'auth',
    },
  })

  const router = useRouter()

  onMounted(() => {
    void logoutFlow()
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
