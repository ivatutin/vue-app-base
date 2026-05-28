import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Alert from './Alert.vue'

const meta: Meta<typeof Alert> = {
  title: 'shared/ui/base/Alert',
  component: Alert,
}

export default meta
type Story = StoryObj<typeof Alert>

export const Kinds: Story = {
  render: () => ({
    components: { Alert },
    template: `
      <div style="display: flex; flex-direction: column; gap: 12px; max-width: 400px;">
        <Alert kind="info">Информационное сообщение</Alert>
        <Alert kind="success">Действие выполнено успешно</Alert>
        <Alert kind="warning">Внимание, что-то требует проверки</Alert>
        <Alert kind="error">Не удалось войти. Проверьте e-mail и пароль</Alert>
      </div>
    `,
  }),
}

export const Closable: Story = {
  render: () => ({
    components: { Alert },
    template: '<Alert kind="info" closable>Можно закрыть</Alert>',
  }),
}

export const Compact: Story = {
  render: () => ({
    components: { Alert },
    template: '<Alert kind="warning" density="compact">Компактная плотность</Alert>',
  }),
}
