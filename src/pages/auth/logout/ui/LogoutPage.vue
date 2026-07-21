<script setup lang="ts">
  import { logoutFlow } from '@/processes/auth-flow'
  import { Button, Card, Spacer } from '@/shared/ui/base'

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
    void router.replace({ name: '/auth/login' })
  }
</script>

<template>
  <Card title="Вы вышли" width="100%">
    Сессия завершена.
    <template #footer>
      <Spacer />
      <Button variant="brand" @click="goToLogin">Войти снова</Button>
    </template>
  </Card>
</template>
