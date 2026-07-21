import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PasswordInput from './PasswordInput.vue'

const meta: Meta<typeof PasswordInput> = {
  title: 'shared/ui/base/PasswordInput',
  component: PasswordInput,
  args: { label: 'Пароль' },
  parameters: {
    docs: {
      description: {
        component:
          'Поле пароля с переключателем видимости. Индикатор надёжности опционален '
          + '(`show-strength`) и нужен только на регистрации и смене пароля — на форме '
          + 'входа он бесполезен и лишь отвлекает.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PasswordInput>

export const Default: Story = {
  render: args => ({
    components: { PasswordInput },
    setup () {
      return { args, value: ref('') }
    },
    template: '<div style="max-width: 320px;"><PasswordInput v-bind="args" v-model="value" /></div>',
  }),
}

/** Индикатор надёжности — для регистрации и смены пароля. */
export const WithStrength: Story = {
  render: () => ({
    components: { PasswordInput },
    setup: () => ({ value: ref('correct-horse-battery') }),
    template: `
      <div style="max-width: 320px;">
        <PasswordInput v-model="value" label="Новый пароль" show-strength autocomplete="new-password" />
      </div>
    `,
  }),
}

/**
 * Шкала надёжности на разных значениях — видно, что короткий, но
 * «сложный» пароль оценивается не выше длинной парольной фразы.
 */
export const StrengthScale: Story = {
  render: () => ({
    components: { PasswordInput },
    template: `
      <div style="display: flex; flex-direction: column; gap: 20px; max-width: 320px;">
        <PasswordInput label="Пустой" model-value="" show-strength />
        <PasswordInput label="Короткий" model-value="qwerty" show-strength />
        <PasswordInput label="Средний" model-value="Qwerty12345" show-strength />
        <PasswordInput label="Парольная фраза" model-value="correct-horse-battery-staple" show-strength />
      </div>
    `,
  }),
}

export const WithError: Story = {
  render: () => ({
    components: { PasswordInput },
    setup: () => ({ value: ref('123') }),
    template: `
      <div style="max-width: 320px;">
        <PasswordInput v-model="value" label="Пароль" error="Минимум 12 символов" />
      </div>
    `,
  }),
}

export const Disabled: Story = {
  render: () => ({
    components: { PasswordInput },
    template: '<div style="max-width: 320px;"><PasswordInput label="Пароль" model-value="secret" disabled /></div>',
  }),
}
