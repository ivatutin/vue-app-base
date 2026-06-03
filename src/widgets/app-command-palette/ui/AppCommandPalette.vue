<script setup lang="ts">
  import type { CommandGroup, CommandItem } from '@/shared/ui/base'
  /**
 * AppCommandPalette — композиционный слой командной палитры (⌘K).
 * Собирает реестр команд (навигация по маршрутам + действия), регистрирует
 * глобальный шорткат и связывает generic CommandPalette с router/RBAC/theme.
 *
 * Монтируется один раз в default-layout. Состояние открытия — общий
 * singleton useCommandPalette (им же управляет триггер в AppHeader).
 */
  import { useEventListener } from '@vueuse/core'
  import { can } from '@/entities/user'
  import { useCommandPalette } from '@/shared/lib/command-palette'
  import { useTheme } from '@/shared/lib/theme'
  import { CommandPalette } from '@/shared/ui/base'

  const router = useRouter()
  const palette = useCommandPalette()
  const theme = useTheme()

  type Command = CommandItem & { perform: () => void | Promise<void> }

  // Глобальный шорткат ⌘K / Ctrl+K.
  useEventListener('keydown', (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      palette.toggle()
    }
  })

  /** Навигация-команда: push без возврата NavigationFailure наружу. */
  function go (to: string) {
    return () => {
      void router.push(to)
    }
  }

  const sections = computed<{ label: string, items: Command[] }[]>(() => {
    const navigation: Command[] = [
      { id: 'nav-dashboard', label: 'Dashboard', icon: 'mdi-view-dashboard-outline', keywords: ['главная', 'обзор'], perform: go('/dashboard') },
      ...(can('user.read')
        ? [{ id: 'nav-users', label: 'Пользователи', icon: 'mdi-account', keywords: ['users'], perform: go('/users') }]
        : []),
      ...(can('role.manage')
        ? [{ id: 'nav-roles', label: 'Роли', icon: 'mdi-shield', keywords: ['roles'], perform: go('/roles') }]
        : []),
      { id: 'nav-uikit', label: 'UI Kit', icon: 'mdi-pencil-ruler', keywords: ['components', 'компоненты'], perform: go('/ui-kit') },
      { id: 'nav-uikit-card', label: 'UI Kit · Card', icon: 'mdi-pencil-ruler', keywords: ['card', 'карточка'], perform: go('/ui-kit/card') },
    ]

    const actions: Command[] = [
      {
        id: 'act-theme',
        label: theme.isDark.value ? 'Светлая тема' : 'Тёмная тема',
        icon: theme.isDark.value ? 'mdi-white-balance-sunny' : 'mdi-weather-night',
        keywords: ['theme', 'тема', 'dark', 'light'],
        perform: () => theme.toggle(),
      },
      { id: 'act-logout', label: 'Выйти', icon: 'mdi-exit-run', keywords: ['logout', 'выход'], perform: go('/auth/logout') },
    ]

    return [
      { label: 'Навигация', items: navigation },
      { label: 'Действия', items: actions },
    ]
  })

  const groups = computed<CommandGroup[]>(() =>
    sections.value.map(section => ({ label: section.label, items: section.items })),
  )

  const registry = computed(() => {
    const map = new Map<string, Command>()
    for (const section of sections.value) {
      for (const item of section.items) {
        map.set(item.id, item)
      }
    }
    return map
  })

  async function onSelect (item: CommandItem) {
    palette.close()
    await registry.value.get(item.id)?.perform()
  }
</script>

<template>
  <CommandPalette
    :groups="groups"
    :open="palette.isOpen.value"
    @select="onSelect"
    @update:open="value => (palette.isOpen.value = value)"
  />
</template>
