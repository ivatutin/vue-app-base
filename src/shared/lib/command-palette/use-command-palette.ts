import { ref } from 'vue'

/**
 * Singleton-состояние открытия командной палитры (⌘K). На module scope —
 * чтобы триггер (кнопка в AppHeader) и горячая клавиша (в AppCommandPalette)
 * управляли одним и тем же состоянием.
 *
 * Только UI-состояние (open/close) — реестр команд собирается выше, на
 * уровне виджета (widgets/app-command-palette), где доступны router/RBAC.
 */
const isOpen = ref(false)

export function useCommandPalette () {
  return {
    isOpen,
    open (): void {
      isOpen.value = true
    },
    close (): void {
      isOpen.value = false
    },
    toggle (): void {
      isOpen.value = !isOpen.value
    },
  }
}
