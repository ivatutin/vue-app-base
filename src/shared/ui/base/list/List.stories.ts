import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ListShadcn from './List.shadcn.vue'
import List from './List.vue'
import ListVuetify from './List.vuetify.vue'
import ListItemShadcn from './ListItem.shadcn.vue'
import ListItem from './ListItem.vue'
import ListItemVuetify from './ListItem.vuetify.vue'

const meta: Meta<typeof List> = {
  title: 'shared/ui/base/List',
  component: List,
}

export default meta
type Story = StoryObj<typeof List>

export const Basic: Story = {
  render: () => ({
    components: { List, ListItem },
    template: `
      <div style="width: 240px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <List>
          <ListItem title="Dashboard" />
          <ListItem title="Users" />
          <ListItem title="Settings" />
        </List>
      </div>
    `,
  }),
}

export const WithIcons: Story = {
  render: () => ({
    components: { List, ListItem },
    template: `
      <div style="width: 240px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <List nav>
          <ListItem icon="mdi-view-dashboard-outline" title="Dashboard" />
          <ListItem icon="mdi-account" title="Users" />
          <ListItem icon="mdi-shield" title="Roles" />
          <ListItem icon="mdi-cog" title="Settings" />
        </List>
      </div>
    `,
  }),
}

export const Active: Story = {
  render: () => ({
    components: { List, ListItem },
    template: `
      <div style="width: 240px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <List nav>
          <ListItem icon="mdi-view-dashboard-outline" title="Dashboard" />
          <ListItem active icon="mdi-account" title="Users" />
          <ListItem disabled icon="mdi-shield" title="Roles (disabled)" />
        </List>
      </div>
    `,
  }),
}

export const Compact: Story = {
  render: () => ({
    components: { List, ListItem },
    template: `
      <div style="width: 240px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <List density="compact" nav>
          <ListItem icon="mdi-view-dashboard-outline" title="Dashboard" />
          <ListItem icon="mdi-account" title="Users" />
          <ListItem icon="mdi-shield" title="Roles" />
        </List>
      </div>
    `,
  }),
}

/**
 * Side-by-side: vuetify v-list vs shadcn собственный nav на Tailwind.
 * shadcn-вариант рендерит router-link/a/button по props, поддерживает
 * active state, использует lucide-иконки через Icon.shadcn.vue.
 */
export const SideBySide: Story = {
  name: 'Side-by-side (vuetify / shadcn)',
  render: () => ({
    components: {
      ListVuetify, ListShadcn, ListItemVuetify, ListItemShadcn,
    },
    template: `
      <div style="display: flex; gap: 24px; align-items: flex-start;">
        <div style="width: 240px;">
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">vuetify</div>
          <div style="border: 1px solid #e5e7eb; border-radius: 8px;">
            <ListVuetify nav>
              <ListItemVuetify icon="mdi-view-dashboard-outline" title="Dashboard" />
              <ListItemVuetify active icon="mdi-account" title="Users" />
              <ListItemVuetify icon="mdi-shield" title="Roles" />
              <ListItemVuetify disabled icon="mdi-cog" title="Settings (disabled)" />
            </ListVuetify>
          </div>
        </div>
        <div style="width: 240px;">
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">shadcn</div>
          <div style="border: 1px solid #e5e7eb; border-radius: 8px;">
            <ListShadcn nav>
              <ListItemShadcn icon="mdi-view-dashboard-outline" title="Dashboard" />
              <ListItemShadcn active icon="mdi-account" title="Users" />
              <ListItemShadcn icon="mdi-shield" title="Roles" />
              <ListItemShadcn disabled icon="mdi-cog" title="Settings (disabled)" />
            </ListShadcn>
          </div>
        </div>
      </div>
    `,
  }),
}
