<script setup lang="ts">
  import { can } from '@/entities/user'
  import { cn } from '@/shared/lib/utils/cn'
  import { Button, Icon } from '@/shared/ui/base'
  import { sidebarSections } from '../model/sidebar-items'
  import { useSidebar } from '../model/use-sidebar'

  const { collapsed, toggle } = useSidebar()

  /** Секции с отфильтрованными по permissions пунктами; пустые секции скрываем. */
  const visibleSections = computed(() =>
    sidebarSections
      .map(section => ({
        ...section,
        items: section.items.filter(item => !item.permission || can(item.permission)),
      }))
      .filter(section => section.items.length > 0),
  )

  const ITEM_BASE = 'relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring'
  const ITEM_ACTIVE = 'bg-brand/10 text-brand font-semibold before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-brand'
  const ITEM_INACTIVE = 'font-medium text-foreground/70 hover:bg-accent hover:text-foreground'
</script>

<template>
  <aside
    class="flex flex-col border-r bg-sidebar text-surface-foreground overflow-hidden transition-[width] duration-200 ease-in-out"
    :class="collapsed ? 'w-16' : 'w-60'"
  >
    <!-- Brand / collapse -->
    <div
      class="flex items-center gap-2 h-14 border-b shrink-0"
      :class="collapsed ? 'justify-center px-2' : 'px-3'"
    >
      <template v-if="!collapsed">
        <div class="grid place-items-center size-7 shrink-0 rounded-md bg-brand text-brand-foreground text-sm font-bold">
          V
        </div>
        <span class="flex-1 truncate font-semibold tracking-tight">vue-app-base</span>
      </template>
      <Button
        icon="mdi-dock-left"
        :title="collapsed ? 'Развернуть меню' : 'Свернуть меню'"
        variant="text"
        @click="toggle()"
      />
    </div>

    <!-- Навигация -->
    <nav class="flex-1 overflow-y-auto px-2 py-3 space-y-5">
      <div v-for="(section, index) in visibleSections" :key="section.title ?? index">
        <p
          v-if="!collapsed && section.title"
          class="px-3 pb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          {{ section.title }}
        </p>
        <div class="space-y-0.5">
          <RouterLink
            v-for="item in section.items"
            :key="item.to"
            v-slot="{ href, navigate, isActive }"
            custom
            :to="item.to"
          >
            <a
              :class="cn(ITEM_BASE, isActive ? ITEM_ACTIVE : ITEM_INACTIVE, collapsed && 'justify-center')"
              :href="href"
              :title="collapsed ? item.label : undefined"
              @click="navigate"
            >
              <Icon v-if="item.icon" :name="item.icon" size="sm" />
              <span v-if="!collapsed" class="flex-1 truncate">{{ item.label }}</span>
            </a>
          </RouterLink>
        </div>
      </div>
    </nav>
  </aside>
</template>
