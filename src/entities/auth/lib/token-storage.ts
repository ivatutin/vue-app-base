const ACCESS_KEY = '__Secure_access-token'
const REFRESH_KEY = '__Secure_refresh-token'

export const tokenStorage = {
  getAccessToken (): string | null {
    return localStorage.getItem(ACCESS_KEY)
  },

  getRefreshToken (): string | null {
    return localStorage.getItem(REFRESH_KEY)
  },

  setTokens (access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },

  clear () {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}
