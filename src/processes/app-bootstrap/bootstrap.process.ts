import { useBootstrapStore } from '@/entities/bootstrap'
// import { useConfigStore } from '@/entities/config'
// import { useAuthStore } from '@/entities/auth'
import { sleep } from '@/shared/lib/utils'

export async function runBootstrapProcess() {
  const bootstrap = useBootstrapStore()
//   const config = useConfigStore()
//   const auth = useAuthStore()

  bootstrap.start()

  try {
    await Promise.all([
        sleep(5000),
        // config.loadConfig(),
        // auth.init(),
    ])
    bootstrap.finish()
  } catch (error) {
    bootstrap.fail(error)
    throw error
  }
}