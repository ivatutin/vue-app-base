import { useBootstrapStore } from '@/entities/bootstrap'
import { useAuthStore } from '@/entities/auth'
import { useUserStore } from '@/entities/user'
import { retryOn404 } from '@/shared/lib/async'
import type { Router } from 'vue-router'

interface BootstrapContext {
  router: Router
}

export async function runBootstrapProcess(context?: BootstrapContext) {
  const bootstrap = useBootstrapStore()
  const auth = useAuthStore()
  const user = useUserStore()

  bootstrap.start()

  try {
    auth.init()

    if (auth.isSessionActive) {
      // /users/me может вернуть 404 сразу после первого sign-in
      // (local user создаётся асинхронно через UserSignedInEvent
      // на стороне njs-server). Ретраим до ~1.5s, дальше bootstrap.fail.
      await retryOn404(() => user.fetchCurrentUser(), { attempts: 3, delay: 500 })
    }

    if (context?.router) {
      await context.router.isReady()
    }

    bootstrap.finish()
  } catch (error) {
    bootstrap.fail(error)
    throw error
  }
}
