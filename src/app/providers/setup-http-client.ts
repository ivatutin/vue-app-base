import type { App } from 'vue'
import { useAuthStore } from '@/entities/auth'
import { logoutFlow } from '@/processes/auth-flow'
import { HttpClient, setHttpClient } from '@/shared/api'
import { env } from '@/shared/config'

export function setupHttpClient (_app: App): HttpClient {
  const auth = useAuthStore()

  const client = new HttpClient({
    baseUrl: env.VITE_API_URL,
    getAccessToken: () => auth.accessToken,
    onUnauthorized: async () => {
      try {
        await auth.refresh()
        return true
      } catch {
        // Полная очистка: tokens + user-state. Раньше зов был
        // auth.logout(), user-state оставался осиротевшим.
        await logoutFlow()
        return false
      }
    },
  })

  setHttpClient(client)
  return client
}
