import type { User } from '../index'
import { type PermissionCode, rolesToPermissions } from '@/shared/model/permission'
import { getCurrentUser } from '../api'

export const useUserStore = defineStore('user', () => {
  /**
   * State
   */
  const user = ref<User | null>(null)

  /**
   * Getters
   */
  const isAuthenticated = computed(() => user.value !== null)
  const isAuthorized = computed(() => user.value !== null && user.value.status === 'active')

  const roles = computed(() => user.value?.roles ?? [])
  const permissions = computed<PermissionCode[]>(() => rolesToPermissions(roles.value))

  const fullName = computed<string | null>(() => {
    if (!user.value) {
      return null
    }
    const parts = [user.value.firstName, user.value.lastName].filter(Boolean)
    return parts.length > 0 ? parts.join(' ') : (user.value.email ?? user.value.phone)
  })

  const hasRole = (role: string): boolean => roles.value.includes(role)
  const hasPermission = (permission: PermissionCode): boolean =>
    permissions.value.includes(permission)

  async function fetchCurrentUser () {
    try {
      user.value = await getCurrentUser()
    } catch (error) {
      user.value = null
      throw error
    }
  }

  function reset () {
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
    fullName,
    hasRole,
    hasPermission,

    /** actions */
    fetchCurrentUser,
    reset,
  }
})
