import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TextField from './TextField.vue'

const meta: Meta<typeof TextField> = {
  title: 'shared/ui/base/TextField',
  component: TextField,
  args: { label: 'E-mail', type: 'email', size: 'md' },
}

export default meta
type Story = StoryObj<typeof TextField>

export const Default: Story = {
  render: args => ({
    components: { TextField },
    setup () {
      return { args, value: ref('') }
    },
    template: '<TextField v-bind="args" v-model="value" />',
  }),
}

export const WithError: Story = {
  render: () => ({
    components: { TextField },
    setup () {
      return { value: ref('invalid email') }
    },
    template: '<TextField v-model="value" label="E-mail" type="email" error="Неверный формат e-mail" />',
  }),
}

export const Sizes: Story = {
  render: () => ({
    components: { TextField },
    template: `
      <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
        <TextField label="Small" size="sm" />
        <TextField label="Medium" size="md" />
        <TextField label="Large" size="lg" />
      </div>
    `,
  }),
}

export const Disabled: Story = {
  render: () => ({
    components: { TextField },
    template: '<TextField label="Disabled" model-value="readonly value" disabled />',
  }),
}
