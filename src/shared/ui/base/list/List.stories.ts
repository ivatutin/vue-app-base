import type { Meta, StoryObj } from '@storybook/vue3-vite'
import List from './List.vue'
import ListItem from './ListItem.vue'

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
