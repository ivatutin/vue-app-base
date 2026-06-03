import type { PermissionCode } from '@/shared/model/permission'

export type SidebarItem = {
  label: string
  to: string
  permission?: PermissionCode
  icon?: string
}

export type SidebarSection = {
  /** Заголовок секции. Скрывается в rail-режиме (остаётся визуальный разделитель). */
  title?: string
  items: SidebarItem[]
}

/**
 * Навигация сайдбара, сгруппированная в секции. Группировка снижает
 * когнитивную нагрузку при росте числа пунктов (паттерн Linear/Notion).
 * Фильтрация по permissions — на уровне AppSidebar (can()).
 */
export const sidebarSections: SidebarSection[] = [
  {
    title: 'Обзор',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: 'mdi-view-dashboard-outline' },
    ],
  },
  {
    title: 'Управление',
    items: [
      { label: 'Пользователи', to: '/users', permission: 'user.read', icon: 'mdi-account' },
      { label: 'Роли', to: '/roles', permission: 'role.manage', icon: 'mdi-shield' },
    ],
  },
  {
    title: 'Разработка',
    items: [
      { label: 'UI Kit', to: '/ui-kit', icon: 'mdi-pencil-ruler' },
    ],
  },
]
