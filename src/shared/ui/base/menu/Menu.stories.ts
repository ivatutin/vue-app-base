import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Button } from '../button'
import { Divider } from '../divider'
import { List, ListItem } from '../list'
import Menu from './Menu.vue'

const meta: Meta<typeof Menu> = {
  title: 'shared/ui/base/Menu',
  component: Menu,
}

export default meta
type Story = StoryObj<typeof Menu>

export const Basic: Story = {
  render: () => ({
    components: { Menu, Button, List, ListItem, Divider },
    template: `
      <div style="padding: 80px;">
        <Menu>
          <template #activator="{ props }">
            <Button v-bind="props" variant="tonal">Открыть меню</Button>
          </template>
          <List density="compact">
            <ListItem icon="mdi-account-edit-outline" title="Мой профиль" />
            <ListItem icon="mdi-cog" title="Настройки" />
            <Divider />
            <ListItem icon="mdi-exit-run" title="Выйти" />
          </List>
        </Menu>
      </div>
    `,
  }),
}

export const IconActivator: Story = {
  render: () => ({
    components: { Menu, Button, List, ListItem },
    template: `
      <div style="padding: 80px;">
        <Menu>
          <template #activator="{ props }">
            <Button v-bind="props" icon="mdi-dots-vertical" variant="text" />
          </template>
          <List density="compact">
            <ListItem icon="mdi-pencil" title="Изменить" />
            <ListItem icon="mdi-content-copy" title="Дублировать" />
            <ListItem icon="mdi-delete" title="Удалить" />
          </List>
        </Menu>
      </div>
    `,
  }),
}

export const LocationEnd: Story = {
  render: () => ({
    components: { Menu, Button, List, ListItem },
    template: `
      <div style="padding: 80px; display: flex; justify-content: flex-end;">
        <Menu location="bottom end">
          <template #activator="{ props }">
            <Button v-bind="props" icon="mdi-dots-vertical" variant="text" />
          </template>
          <List density="compact">
            <ListItem title="Пункт 1" />
            <ListItem title="Пункт 2" />
          </List>
        </Menu>
      </div>
    `,
  }),
}
