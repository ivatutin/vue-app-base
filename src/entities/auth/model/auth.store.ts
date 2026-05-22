import { tokenStorage } from '../lib/token-storage'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const isLoading = ref(false)

  const isSessionActive = computed(() => !!accessToken.value)

  function init(): void {
    accessToken.value = tokenStorage.getAccessToken()
    refreshToken.value = tokenStorage.getRefreshToken()
  }

  async function login(emailOrPhone: string, password: string): Promise<void> {
    isLoading.value = true
    try {
      // TODO: реальный POST /auth/login через shared/api/http-client (ROADMAP, Фаза 1)
      void emailOrPhone
      void password
      throw new Error('login() not implemented yet')
    } finally {
      isLoading.value = false
    }
  }

  async function refresh(): Promise<void> {
    isLoading.value = true
    try {
      // TODO: реальный POST /auth/refresh через shared/api/http-client (ROADMAP, Фаза 1)
      throw new Error('refresh() not implemented yet')
    } finally {
      isLoading.value = false
    }
  }

  function logout(): void {
    accessToken.value = null
    refreshToken.value = null
    tokenStorage.clear()
  }

  return {
    accessToken,
    refreshToken,
    isLoading,
    isSessionActive,
    init,
    login,
    refresh,
    logout,
  }
})
