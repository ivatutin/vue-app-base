import { useBootstrapStore } from '@/entities/bootstrap'
import { useAuthStore } from '@/entities/auth'
import { useUserStore } from '@/entities/user'
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
      await user.fetchCurrentUser()
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
