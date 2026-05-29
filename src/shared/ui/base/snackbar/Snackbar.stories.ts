import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Snackbar from './Snackbar.vue'

const meta: Meta<typeof Snackbar> = {
  title: 'shared/ui/base/Snackbar',
  component: Snackbar,
  args: {
    message: 'Действие выполнено',
    kind: 'info',
    timeout: -1,
    closable: true,
    location: 'top right',
  },
}

export default meta
type Story = StoryObj<typeof Snackbar>

export const Info: Story = {
  args: { kind: 'info', message: 'Информационное сообщение' },
}

export const Success: Story = {
  args: { kind: 'success', message: 'Данные сохранены' },
}

export const Warning: Story = {
  args: { kind: 'warning', message: 'Сессия скоро истечёт' },
}

export const Error: Story = {
  args: { kind: 'error', message: 'Не удалось выполнить запрос' },
}

export const WithAutoDismiss: Story = {
  args: {
    kind: 'success',
    message: 'Закроется автоматически через 3 секунды',
    timeout: 3000,
  },
}

export const NotClosable: Story = {
  args: {
    kind: 'info',
    message: 'Без крестика — закроется только по таймауту',
    timeout: 5000,
    closable: false,
  },
}
