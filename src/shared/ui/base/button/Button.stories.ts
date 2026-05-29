import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Button from './Button.vue'

const meta: Meta<typeof Button> = {
  title: 'shared/ui/base/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'tonal', 'text', 'destructive'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
  args: {
    variant: 'primary',
    size: 'md',
    loading: false,
    disabled: false,
    block: false,
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  render: args => ({
    components: { Button },
    setup () {
      return { args }
    },
    template: '<Button v-bind="args">Войти</Button>',
  }),
}

export const Variants: Story = {
  render: () => ({
    components: { Button },
    template: `
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="tonal">Tonal</Button>
        <Button variant="text">Text</Button>
        <Button variant="destructive">Destructive</Button>
      </div>
    `,
  }),
}

export const Sizes: Story = {
  render: () => ({
    components: { Button },
    template: `
      <div style="display: flex; gap: 12px; align-items: center;">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
      </div>
    `,
  }),
}

export const States: Story = {
  render: () => ({
    components: { Button },
    template: `
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <Button>Default</Button>
        <Button loading>Loading</Button>
        <Button disabled>Disabled</Button>
        <Button block>Block</Button>
      </div>
    `,
  }),
}

export const IconOnly: Story = {
  render: () => ({
    components: { Button },
    template: `
      <div style="display: flex; gap: 12px; align-items: center;">
        <Button icon="mdi-pencil" variant="text" />
        <Button icon="mdi-delete" variant="text" />
        <Button icon="mdi-content-save" variant="primary" />
        <Button icon="mdi-close" variant="tonal" />
      </div>
    `,
  }),
}
