import type { App } from 'vue'
import { HttpClient, setHttpClient } from '@/shared/api'
import { env } from '@/shared/config'
import { useAuthStore } from '@/entities/auth'

export function setupHttpClient(_app: App): HttpClient {
  const auth = useAuthStore()

  const client = new HttpClient({
    baseUrl: env.VITE_API_URL,
    getAccessToken: () => auth.accessToken,
    onUnauthorized: async () => {
      try {
        await auth.refresh()
        return true
      } catch {
        auth.logout()
        return false
      }
    },
  })

  setHttpClient(client)
  return client
}
