import type { PermissionCode } from '@/shared/model/permission'

export type SidebarItem = {
  label: string
  to: string
  permission?: PermissionCode
  icon?: string
}

export const sidebarItems: SidebarItem[] = [
  { label: 'Users', to: '/users', permission: 'user.read', icon: 'mdi-account' },
  { label: 'Roles', to: '/roles', permission: 'role.manage', icon: 'mdi-shield' },
  { label: 'UiKit', to: 'ui-kit', icon: 'mdi-pencil-ruler' },
  { label: 'Dashboard', to: 'dashboard', icon: 'mdi-view-dashboard-outline' },
]
