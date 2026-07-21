<script setup lang="ts">
/**
 * Объяснение, почему аутентифицированный пользователь не допущен
 * в приложение.
 *
 * Существует, чтобы разорвать цикл: раньше guard отправлял такого
 * пользователя на login, тот успешно входил заново и снова получал
 * отказ — без единого слова о причине.
 *
 * `noAuth: true` намеренно: страница обязана быть достижимой для того,
 * кого guard как раз и не пускает, иначе редирект зациклится уже на ней.
 */
  import { storeToRefs } from 'pinia'
  import { useUserStore } from '@/entities/user'
  import { logoutFlow } from '@/processes/auth-flow'
  import { getFailureMessage } from '@/shared/api'
  import { Button, EmptyState } from '@/shared/ui/base'

  definePage({
    meta: {
      title: 'Статус аккаунта',
      noAuth: true,
      layout: 'auth',
    },
  })

  const router = useRouter()
  const userStore = useUserStore()
  const { status, isAuthenticated, isAuthorized } = storeToRefs(userStore)

  const checking = ref(false)
  const leaving = ref(false)
  const error = ref<string | null>(null)

  const view = computed(() => {
    switch (status.value) {
      case 'pending_verification': {
        return {
          icon: 'mdi-email-check-outline',
          title: 'Подтвердите контакт',
          description:
            'Аккаунт создан, но ещё не подтверждён. Откройте ссылку из письма или введите код из SMS, затем вернитесь сюда.',
          canRecheck: true,
        }
      }
      case 'suspended': {
        return {
          icon: 'mdi-lock',
          title: 'Аккаунт заблокирован',
          description:
            'Доступ приостановлен. Если это ошибка — обратитесь в поддержку, блокировку снимают вручную.',
          canRecheck: false,
        }
      }
      case 'deleted': {
        return {
          icon: 'mdi-account-off',
          title: 'Аккаунт удалён',
          description: 'Этот аккаунт больше не существует. Войти в него нельзя.',
          canRecheck: false,
        }
      }
      default: {
        return {
          icon: 'mdi-alert',
          title: 'Доступ недоступен',
          description: 'Не удалось определить статус аккаунта.',
          canRecheck: true,
        }
      }
    }
  })

  /**
   * Страница нужна только «подвешенным» пользователям. Активного
   * отправляем работать, неаутентифицированного — на вход. Иначе она
   * превращается в тупик, из которого не выбраться по прямой ссылке.
   */
  watchEffect(() => {
    if (isAuthorized.value) {
      void router.replace({ name: '/dashboard' })
    } else if (!isAuthenticated.value && !checking.value && !leaving.value) {
      void router.replace({ name: '/auth/login' })
    }
  })

  /**
   * Подтверждение происходит вне этой вкладки (письмо, SMS), поэтому
   * статус меняется без нашего ведома — нужна ручная перепроверка.
   */
  async function recheck () {
    checking.value = true
    error.value = null
    try {
      await userStore.fetchCurrentUser()
      if (userStore.isAuthorized) {
        await router.replace({ name: '/dashboard' })
      }
    } catch (error_) {
      error.value = getFailureMessage(error_)
    } finally {
      checking.value = false
    }
  }

  async function leave () {
    leaving.value = true
    try {
      await logoutFlow()
    } finally {
      await router.replace({ name: '/auth/login' })
    }
  }
</script>

<template>
  <EmptyState
    :description="view.description"
    :icon="view.icon"
    :title="view.title"
  >
    <div class="flex flex-col items-center gap-3">
      <div class="flex flex-wrap justify-center gap-2">
        <Button
          v-if="view.canRecheck"
          :loading="checking"
          variant="brand"
          @click="recheck"
        >
          Проверить снова
        </Button>
        <Button :loading="leaving" variant="outlined" @click="leave">
          Выйти
        </Button>
      </div>

      <p v-if="error" class="text-xs text-error" role="alert">
        {{ error }}
      </p>
    </div>
  </EmptyState>
</template>
