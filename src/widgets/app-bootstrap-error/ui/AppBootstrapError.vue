<script lang="ts" setup>
/**
 * Экран отказа на старте приложения.
 *
 * Важное ограничение: рендерится ВНЕ <router-view>, то есть без layout'а
 * и без <AppNotifications>. Поэтому он обязан быть самодостаточным —
 * ни snackbar, ни навигация здесь недоступны. Именно из-за этого раньше
 * ошибка bootstrap физически не могла достичь экрана: она попадала
 * в notification-стор, который рендерится внутри layout'а.
 */
  import type { BootstrapError } from '@/entities/bootstrap'
  import { CircleAlert, RefreshCw, ServerCrash, TriangleAlert, WifiOff } from '@lucide/vue'
  import { useEventListener } from '@vueuse/core'
  import { Button } from '@/shared/ui/base'

  const props = defineProps<{
    error: BootstrapError | null
    retrying?: boolean
  }>()

  const emit = defineEmits<{ retry: [] }>()

  /** Пауза до авто-повтора растёт, чтобы не долбить лежащий сервер. */
  const AUTO_RETRY_DELAYS_SEC = [10, 30, 60]

  const attempt = ref(0)
  const secondsLeft = ref(0)
  let ticker: ReturnType<typeof setInterval> | null = null

  const kind = computed(() => props.error?.kind ?? 'unknown')
  const canRetry = computed(() => props.error?.retryable === true)

  const icon = computed(() => {
    switch (kind.value) {
      case 'offline': {
        return WifiOff
      }
      case 'server':
      case 'timeout':
      case 'network': {
        return ServerCrash
      }
      case 'contract': {
        return TriangleAlert
      }
      default: {
        return CircleAlert
      }
    }
  })

  const title = computed(() => {
    switch (kind.value) {
      case 'offline': {
        return 'Нет подключения к интернету'
      }
      case 'timeout':
      case 'network':
      case 'server': {
        return 'Сервис недоступен'
      }
      default: {
        return 'Не удалось запустить приложение'
      }
    }
  })

  const description = computed(() => {
    switch (kind.value) {
      case 'offline': {
        return 'Проверьте подключение — приложение продолжит работу автоматически, как только связь появится.'
      }
      case 'timeout': {
        return 'Сервер не ответил вовремя. Обычно это временно.'
      }
      case 'network': {
        return 'Не удалось связаться с сервером. Возможно, идут технические работы.'
      }
      case 'server': {
        return 'Сервер отвечает ошибкой. Мы повторим попытку автоматически.'
      }
      case 'contract': {
        return 'Сервер вернул неожиданный ответ. Повтор не поможет — сообщите в поддержку.'
      }
      default: {
        return 'Что-то пошло не так при запуске. Попробуйте обновить страницу.'
      }
    }
  })

  function stopTicker (): void {
    if (ticker !== null) {
      clearInterval(ticker)
      ticker = null
    }
  }

  function reloadPage (): void {
    globalThis.location.reload()
  }

  function triggerRetry (): void {
    stopTicker()
    attempt.value++
    emit('retry')
  }

  function scheduleAutoRetry (): void {
    stopTicker()

    if (!canRetry.value) {
      return
    }

    const index = Math.min(attempt.value, AUTO_RETRY_DELAYS_SEC.length - 1)
    secondsLeft.value = AUTO_RETRY_DELAYS_SEC[index]!

    ticker = setInterval(() => {
      secondsLeft.value--
      if (secondsLeft.value <= 0) {
        triggerRetry()
      }
    }, 1000)
  }

  // Сеть вернулась — повторяем немедленно, не дожидаясь таймера.
  // Дёшево, но именно это превращает «вышел из метро» в «приложение
  // само поднялось» вместо «пользователь тыкает кнопку».
  useEventListener(window, 'online', () => {
    if (canRetry.value && !props.retrying) {
      triggerRetry()
    }
  })

  // Возврат во вкладку — тоже хороший момент для повтора.
  useEventListener(document, 'visibilitychange', () => {
    if (!document.hidden && canRetry.value && !props.retrying) {
      triggerRetry()
    }
  })

  watch(
    () => [props.error, props.retrying] as const,
    ([error, retrying]) => {
      if (error && !retrying) {
        scheduleAutoRetry()
      } else {
        stopTicker()
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(stopTicker)
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center p-6">
    <div
      aria-live="assertive"
      class="w-full max-w-md text-center"
      role="alert"
    >
      <component
        :is="icon"
        aria-hidden="true"
        class="mx-auto mb-5 size-10 text-muted-foreground"
      />

      <h1 class="text-lg font-semibold text-foreground">
        {{ title }}
      </h1>

      <p class="mt-2 text-sm text-muted-foreground">
        {{ description }}
      </p>

      <div v-if="canRetry" class="mt-6 flex flex-col items-center gap-2">
        <Button :loading="retrying" @click="triggerRetry">
          <RefreshCw v-if="!retrying" aria-hidden="true" class="mr-2 size-4" />
          {{ retrying ? 'Подключаемся…' : 'Повторить' }}
        </Button>

        <p v-if="!retrying && secondsLeft > 0" class="text-xs text-muted-foreground">
          Автоматический повтор через {{ secondsLeft }} с
        </p>
      </div>

      <Button v-else class="mt-6" variant="outlined" @click="reloadPage">
        Обновить страницу
      </Button>

      <details v-if="error?.technical" class="mt-8 text-left">
        <summary class="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
          Технические детали
        </summary>
        <p class="mt-2 rounded-md bg-muted p-3 font-mono text-xs break-all text-muted-foreground">
          {{ error.technical }}
        </p>
      </details>
    </div>
  </div>
</template>
