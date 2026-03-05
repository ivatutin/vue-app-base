import { useBootstrapStore } from '@/entities/bootstrap'
// import { useConfigStore } from '@/entities/config'
// import { useAuthStore } from '@/entities/auth'
import { sleep } from '@/shared/lib/utils'
import type { Router } from 'vue-router'

interface BootstrapContext {
  router: Router
}

export async function runBootstrapProcess(context?: BootstrapContext) {
  const bootstrap = useBootstrapStore()
//   const config = useConfigStore()
//   const auth = useAuthStore()

  bootstrap.start()

  try {
    await Promise.all([
        sleep(3000),
        // config.loadConfig(),
        // auth.init(),
    ])
    if (context?.router) {
      await context?.router.isReady()
    }
    bootstrap.finish()
  } catch (error) {
    bootstrap.fail(error)
    throw error
  }
}