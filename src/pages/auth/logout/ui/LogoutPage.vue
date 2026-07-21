<script setup lang="ts">
  import { logoutFlow } from '@/processes/auth-flow'
  import { Button, Card, Spacer } from '@/shared/ui/base'

  definePage({
    meta: {
      title: 'Выход',
      noAuth: true,
      layout: 'auth',
    },
  })

  const router = useRouter()
  const pending = ref(true)

  /**
   * `logoutFlow` гарантирует локальную очистку через `finally` — токены
   * и профиль стираются даже при упавшем sign-out на бэке. Поэтому
   * с точки зрения пользователя выход состоялся в любом случае,
   * и показывать ему ошибку сети незачем.
   *
   * Ловим reject явно, а не через `void`: `void` глушит только линтер,
   * runtime всё равно поднял бы unhandledrejection, и глобальный
   * error-handler показал бы снекбар с ошибкой поверх экрана «Вы вышли».
   */
  onMounted(async () => {
    try {
      await logoutFlow()
    } catch (error) {
      console.warn('[logout] sign-out на бэке не удался, локальная сессия очищена', error)
    } finally {
      pending.value = false
    }
  })

  function goToLogin () {
    void router.replace({ name: '/auth/login' })
  }
</script>

<template>
  <Card :title="pending ? 'Выходим…' : 'Вы вышли'" width="100%">
    {{ pending ? 'Завершаем сессию.' : 'Сессия завершена.' }}
    <template #footer>
      <Spacer />
      <Button :disabled="pending" variant="brand" @click="goToLogin">
        Войти снова
      </Button>
    </template>
  </Card>
</template>
