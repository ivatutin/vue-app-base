import type { Meta, StoryObj } from '@storybook/vue3-vite'
import TextFieldShadcn from './TextField.shadcn.vue'
import TextField from './TextField.vue'
import TextFieldVuetify from './TextField.vuetify.vue'

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

/**
 * Side-by-side: vuetify (filled/outlined with floating label) vs
 * shadcn (block label above input). Семантика API одинакова,
 * визуальная подача отличается — shadcn ближе к Linear/Stripe.
 */
export const SideBySide: Story = {
  name: 'Side-by-side (vuetify / shadcn)',
  render: () => ({
    components: { TextFieldVuetify, TextFieldShadcn },
    setup () {
      return {
        email: ref(''),
        emailInvalid: ref('not-an-email'),
        password: ref(''),
      }
    },
    template: `
      <div style="display: flex; gap: 32px; max-width: 720px;">
        <div style="flex: 1;">
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">vuetify</div>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <TextFieldVuetify v-model="email" label="E-mail" type="email" required autocomplete="email" />
            <TextFieldVuetify v-model="emailInvalid" label="E-mail" type="email" error="Неверный формат" />
            <TextFieldVuetify v-model="password" label="Пароль" type="password" required />
            <TextFieldVuetify label="Disabled" model-value="readonly" disabled />
          </div>
        </div>
        <div style="flex: 1;">
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">shadcn</div>
          <div style="display: flex; flex-direction: column; gap: 16px;">
            <TextFieldShadcn v-model="email" label="E-mail" type="email" required autocomplete="email" />
            <TextFieldShadcn v-model="emailInvalid" label="E-mail" type="email" error="Неверный формат" />
            <TextFieldShadcn v-model="password" label="Пароль" type="password" required />
            <TextFieldShadcn label="Disabled" model-value="readonly" disabled />
          </div>
        </div>
      </div>
    `,
  }),
}
