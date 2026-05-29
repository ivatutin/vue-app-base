import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Spacer from './Spacer.vue'

const meta: Meta<typeof Spacer> = {
  title: 'shared/ui/base/Spacer',
  component: Spacer,
}

export default meta
type Story = StoryObj<typeof Spacer>

const containerStyle
  = 'display: flex; align-items: center; gap: 8px; '
    + 'padding: 8px 12px; border: 1px solid #e5e7eb; border-radius: 8px;'

export const Active: Story = {
  render: () => ({
    components: { Spacer },
    template: `
      <div style="${containerStyle}">
        <span>left</span>
        <Spacer />
        <span>right</span>
      </div>
    `,
  }),
}
