import { ref, watch } from 'vue'

/**
 * Состояние сворачивания сайдбара (rail-режим). Singleton на module scope —
 * все потребители (AppSidebar, при желании AppHeader) видят один флаг.
 * Persist'ится в localStorage, чтобы выбор пользователя переживал перезагрузку.
 *
 * SSR-safe: чтение/запись localStorage обёрнуты в try/typeof window.
 */
const STORAGE_KEY = '__app-sidebar-collapsed'

function readInitial (): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

const collapsed = ref<boolean>(readInitial())

watch(collapsed, value => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
  } catch {
    /* приватный режим / нет доступа к localStorage — игнорируем */
  }
})

export function useSidebar () {
  return {
    collapsed,
    toggle (): void {
      collapsed.value = !collapsed.value
    },
  }
}
