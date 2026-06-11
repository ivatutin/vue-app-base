<script setup lang="ts">
/**
 * shadcn-vue реализация Icon — на @lucide/vue (SVG-иконки).
 *
 * Контракт `name: string` принимает MDI-имена (`mdi-account`, …) для
 * совместимости с потребителями vuetify-версии. Внутри маппится через
 * `MDI_TO_LUCIDE` в lucide-компонент. Неизвестное имя → null +
 * console.warn (заметно в dev, не падает в prod).
 *
 * **Расширение словаря.** Новая иконка в коде → добавь mapping здесь,
 * иначе lint пройдёт, а в браузере будет пусто + warning.
 *
 * После Шага 14 миграции (когда vuetify-версия удалится) словарь
 * переедет в семантические имена (`'user'` вместо `'mdi-account'`), а
 * потребители — на них через codemod-замену.
 */
  import type { Component } from 'vue'
  import {
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    ChevronsUp,
    CodeXml,
    Copy,
    Eye,
    EyeOff,
    FileQuestion,
    Home,
    Inbox,
    LayoutDashboard,
    Lock,
    LogOut,
    Moon,
    MoreVertical,
    PanelLeft,
    Pencil,
    PencilRuler,
    Plus,
    RefreshCw,
    Save,
    Search,
    Settings,
    Shield,
    Sun,
    Trash2,
    TrendingDown,
    TrendingUp,
    User,
    UserPen,
    X,
  } from '@lucide/vue'

  type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

  const props = withDefaults(defineProps<{
    name: string
    size?: Size
    color?: string
  }>(), {
    size: 'md',
    color: 'currentColor',
  })

  const MDI_TO_LUCIDE: Record<string, Component> = {
    'mdi-account': User,
    'mdi-account-edit-outline': UserPen,
    'mdi-chevron-double-up': ChevronsUp,
    'mdi-chevron-right': ChevronRight,
    'mdi-close': X,
    'mdi-cog': Settings,
    'mdi-content-copy': Copy,
    'mdi-content-save': Save,
    'mdi-delete': Trash2,
    'mdi-dock-left': PanelLeft,
    'mdi-dots-vertical': MoreVertical,
    'mdi-exit-run': LogOut,
    'mdi-eye': Eye,
    'mdi-eye-off': EyeOff,
    'mdi-file-question': FileQuestion,
    'mdi-home': Home,
    'mdi-inbox': Inbox,
    'mdi-lock': Lock,
    'mdi-magnify': Search,
    'mdi-pencil': Pencil,
    'mdi-pencil-ruler': PencilRuler,
    'mdi-plus': Plus,
    'mdi-refresh': RefreshCw,
    'mdi-shield': Shield,
    'mdi-trending-down': TrendingDown,
    'mdi-trending-up': TrendingUp,
    'mdi-unfold-less-vertical': ChevronsLeft,
    'mdi-unfold-more-vertical': ChevronsRight,
    'mdi-view-dashboard-outline': LayoutDashboard,
    'mdi-weather-night': Moon,
    'mdi-white-balance-sunny': Sun,
    'mdi-xml': CodeXml,
  }

  const SIZE_PX: Record<Size, number> = {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 36,
  }

  const Impl = computed<Component | null>(() => {
    const found = MDI_TO_LUCIDE[props.name]
    if (!found) {
      console.warn(`[Icon] нет mapping для "${props.name}" в MDI_TO_LUCIDE`)
      return null
    }
    return found
  })

  const pxSize = computed(() => SIZE_PX[props.size])
</script>

<template>
  <component
    :is="Impl"
    v-if="Impl"
    :color="color"
    :size="pxSize"
  />
</template>
