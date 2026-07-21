<script lang="ts" setup>
  import { VueQueryDevtools } from '@tanstack/vue-query-devtools'
  import { useBootstrapStore } from '@/entities/bootstrap'
  import { runBootstrapProcess } from '@/processes/app-bootstrap'
  import { AppBootstrapError } from '@/widgets/app-bootstrap-error'
  import { AppPreloader } from '@/widgets/app-preloader'

  const bootstrap = useBootstrapStore()
  const router = useRouter()
  const isDev = import.meta.env.DEV

  const retrying = ref(false)

  /**
   * Экран ошибки удерживается на время повтора (а не сменяется
   * прелоадером), чтобы виджет не размонтировался: в нём живёт счётчик
   * попыток, на котором построен нарастающий backoff. Иначе каждая
   * неудача сбрасывала бы паузу на исходные 10 секунд.
   */
  async function retryBootstrap (): Promise<void> {
    if (retrying.value) {
      return
    }

    retrying.value = true
    try {
      bootstrap.reset()
      await runBootstrapProcess({ router })
    } finally {
      retrying.value = false
    }
  }
</script>

<template>
  <AppBootstrapError
    v-if="bootstrap.isFailed || retrying"
    :error="bootstrap.error"
    :retrying="retrying"
    @retry="retryBootstrap"
  />
  <router-view v-else-if="bootstrap.isReady" />
  <AppPreloader v-else />
  <!--
    DevTools панель TanStack Query: список queries, кэш, мутации,
    invalidate вручную. Только в dev-сборке — production tree-shake'нет
    через if-проверку и dependency lazy-load.
  -->
  <VueQueryDevtools v-if="isDev" />
</template>
