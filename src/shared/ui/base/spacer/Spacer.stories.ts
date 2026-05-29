import type { Meta, StoryObj } from '@storybook/vue3-vite'
import SpacerShadcn from './Spacer.shadcn.vue'
import Spacer from './Spacer.vue'
import SpacerVuetify from './Spacer.vuetify.vue'

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

/**
 * Side-by-side обеих реализаций (vuetify / shadcn) для визуальной
 * проверки во время Фазы 2.7 миграции. После переключения default
 * на shadcn и удаления vuetify-версии этот story удалится.
 */
export const SideBySide: Story = {
  name: 'Side-by-side (vuetify / shadcn)',
  render: () => ({
    components: { SpacerVuetify, SpacerShadcn },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 4px;">vuetify</div>
          <div style="${containerStyle}">
            <span>left</span>
            <SpacerVuetify />
            <span>right</span>
          </div>
        </div>
        <div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 4px;">shadcn</div>
          <div style="${containerStyle}">
            <span>left</span>
            <SpacerShadcn />
            <span>right</span>
          </div>
        </div>
      </div>
    `,
  }),
}
