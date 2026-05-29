import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Divider from './Divider.vue'

const meta: Meta<typeof Divider> = {
  title: 'shared/ui/base/Divider',
  component: Divider,
}

export default meta
type Story = StoryObj<typeof Divider>

const wrap
  = 'padding: 16px; background: #fafafa; border-radius: 8px; max-width: 360px;'

export const Horizontal: Story = {
  render: () => ({
    components: { Divider },
    template: `
      <div style="${wrap}">
        <div>Сверху</div>
        <Divider />
        <div>Снизу</div>
      </div>
    `,
  }),
}

export const Vertical: Story = {
  render: () => ({
    components: { Divider },
    template: `
      <div style="${wrap} display: flex; align-items: center; gap: 12px; height: 60px;">
        <div>Слева</div>
        <Divider vertical />
        <div>Справа</div>
      </div>
    `,
  }),
}
