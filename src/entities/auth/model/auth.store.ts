import { tokenStorage } from '../lib/token-storage'
import { signIn, refreshTokens, signOut } from '../api'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const refreshToken = ref<string | null>(null)
  const isLoading = ref(false)

  const isSessionActive = computed(() => !!accessToken.value)

  function init(): void {
    accessToken.value = tokenStorage.getAccessToken()
    refreshToken.value = tokenStorage.getRefreshToken()
  }

  async function login(email: string, password: string): Promise<void> {
    isLoading.value = true
    try {
      const pair = await signIn(email, password)
      applyTokens(pair.accessToken, pair.refreshToken)
    } finally {
      isLoading.value = false
    }
  }

  async function refresh(): Promise<void> {
    const current = refreshToken.value
    if (!current) {
      clearTokens()
      throw new Error('No refresh token available')
    }
    isLoading.value = true
    try {
      const pair = await refreshTokens(current)
      applyTokens(pair.accessToken, pair.refreshToken)
    } catch (err) {
      clearTokens()
      throw err
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Локальная очистка сессии. Если есть refreshToken — отправляем
   * sign-out на бэк, но локальное состояние сбрасываем в любом
   * случае (даже при сетевой ошибке). Сброс user-state — на caller'е.
   */
  async function logout(): Promise<void> {
    const current = refreshToken.value
    try {
      if (current) await signOut(current)
    } finally {
      clearTokens()
    }
  }

  function applyTokens(access: string, refresh: string): void {
    accessToken.value = access
    refreshToken.value = refresh
    tokenStorage.setTokens(access, refresh)
  }

  function clearTokens(): void {
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
