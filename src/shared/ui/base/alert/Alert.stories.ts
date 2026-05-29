import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AlertShadcn from './Alert.shadcn.vue'
import Alert from './Alert.vue'
import AlertVuetify from './Alert.vuetify.vue'

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

/**
 * Side-by-side: vuetify vs shadcn. shadcn-вариант поддерживает 3
 * визуальных варианта (tonal — подкрашенный фон, flat — насыщенный,
 * outlined — только border) на тех же tokens.
 */
export const SideBySide: Story = {
  name: 'Side-by-side (vuetify / shadcn)',
  render: () => ({
    components: { AlertVuetify, AlertShadcn },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px; max-width: 480px;">
        <div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">vuetify · tonal</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <AlertVuetify kind="info">Информационное сообщение</AlertVuetify>
            <AlertVuetify kind="success">Действие выполнено успешно</AlertVuetify>
            <AlertVuetify kind="warning">Внимание, требует проверки</AlertVuetify>
            <AlertVuetify kind="error" closable>Не удалось войти</AlertVuetify>
          </div>
        </div>
        <div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">shadcn · tonal</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <AlertShadcn kind="info">Информационное сообщение</AlertShadcn>
            <AlertShadcn kind="success">Действие выполнено успешно</AlertShadcn>
            <AlertShadcn kind="warning">Внимание, требует проверки</AlertShadcn>
            <AlertShadcn kind="error" closable>Не удалось войти</AlertShadcn>
          </div>
        </div>
        <div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">shadcn · variant flat / outlined</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <AlertShadcn kind="error" variant="flat">Flat error</AlertShadcn>
            <AlertShadcn kind="warning" variant="outlined">Outlined warning</AlertShadcn>
            <AlertShadcn kind="success" variant="outlined" density="compact">Compact outlined success</AlertShadcn>
          </div>
        </div>
      </div>
    `,
  }),
}
