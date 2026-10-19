import type { User } from '../index'
import { peekQueryClient } from '@/shared/api'
import { type PermissionCode, rolesToPermissions } from '@/shared/model/permission'
import { getCurrentUser, type UpdateProfileInput, updateUserProfile } from '../api'

export const useUserStore = defineStore('user', () => {
  /**
   * State
   */
  const user = ref<User | null>(null)

  /**
   * Getters
   */
  /** Профиль загружен — сессия есть. Ничего не говорит о её пригодности. */
  const isAuthenticated = computed(() => user.value !== null)

  /**
   * Пригоден к работе. `pending_verification`, `suspended` и `deleted` —
   * это НЕ «неаутентифицирован»: такого пользователя нельзя отправлять
   * на login, он там снова успешно войдёт и снова упрётся в отказ.
   * Разбор по статусу — в guard, см. `resolveGuard`.
   */
  const isAuthorized = computed(() => user.value !== null && user.value.status === 'active')

  const status = computed(() => user.value?.status ?? null)

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

  /**
   * Обновить имя/фамилию. Ответ бэкенда — полный профиль, поэтому применяем его
   * целиком (`roles`/`status` тоже актуальны). Дополнительно кладём его в Query-кэш
   * `['users', 'me']`, если клиент существует: иначе фоновый refetch вернёт старое
   * значение и UI «откатится» на прошлое имя.
   */
  async function updateProfile (input: UpdateProfileInput): Promise<void> {
    const current = user.value
    if (!current) {
      throw new Error('No current user to update')
    }
    const updated = await updateUserProfile(current.id, input)
    user.value = updated
    peekQueryClient()?.setQueryData(['users', 'me'], updated)
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
    status,
    roles,
    permissions,
    fullName,
    hasRole,
    hasPermission,

    /** actions */
    fetchCurrentUser,
    updateProfile,
    reset,
  }
})
