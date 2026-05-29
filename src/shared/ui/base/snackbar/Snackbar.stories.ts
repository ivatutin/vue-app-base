import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SnackbarShadcn from './Snackbar.shadcn.vue'
import Snackbar from './Snackbar.vue'
import SnackbarVuetify from './Snackbar.vuetify.vue'

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

/**
 * Side-by-side: vuetify v-snackbar (portal в body, сам fixed по
 * location) vs shadcn — карточка без позиционирования (родитель
 * управляет stacking, см. widgets/app-notifications fixed wrapper).
 *
 * shadcn-вариант здесь рендерится inline для наглядности; в реальном
 * use case он внутри fixed-стека widget'а.
 */
export const SideBySide: Story = {
  name: 'Side-by-side (vuetify / shadcn)',
  render: () => ({
    components: { SnackbarVuetify, SnackbarShadcn },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">vuetify (portal в body)</div>
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <SnackbarVuetify kind="info" message="Информация" />
            <SnackbarVuetify kind="success" message="Успех" />
            <SnackbarVuetify kind="warning" message="Предупреждение" />
            <SnackbarVuetify kind="error" message="Ошибка" />
          </div>
        </div>
        <div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">shadcn (inline, для наглядности)</div>
          <div style="display: flex; flex-direction: column; gap: 8px; align-items: flex-start;">
            <SnackbarShadcn kind="info" message="Информационное сообщение" />
            <SnackbarShadcn kind="success" message="Данные сохранены" />
            <SnackbarShadcn kind="warning" message="Сессия скоро истечёт" />
            <SnackbarShadcn kind="error" message="Не удалось выполнить запрос" />
          </div>
        </div>
      </div>
    `,
  }),
}
