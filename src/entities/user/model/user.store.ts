import { getCurrentUser, logoutRequest } from '../api'
import type { User } from '../index'
import type { PermissionCode } from '@/shared/model/permission'

export const useUserStore = defineStore('user', () => {
  /**
   * State
   */
  const user = ref<User | null>(null)

  /**
   * Getters
   */
  const isAuthenticated = computed(() => user.value !== null)
  const isAuthorized = computed(() => user.value !== null && user.value.isActive)


  const roles = computed(() => user.value?.roles ?? [])
  const permissions = computed(() => user.value?.permissions ?? [])

  const hasRole = (role: string): boolean =>
    roles.value.includes(role)

  const hasPermission = (permission: PermissionCode): boolean =>
    permissions.value.includes(permission)

  
  async function fetchCurrentUser() {
    try {
      user.value = await getCurrentUser()
    } catch {
      user.value = null
    }
  }

  async function logout() {
    await logoutRequest()
    reset()
  }

  function reset() {
    user.value = null
  }

  return {
    /** state */
    user,

    /** getters */
    isAuthenticated,
    isAuthorized,
    roles,
    permissions,
    hasRole,
    hasPermission,

    /** actions */
    fetchCurrentUser,
    logout,
    reset,
  }
})
