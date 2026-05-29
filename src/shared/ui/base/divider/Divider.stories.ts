import type { Meta, StoryObj } from '@storybook/vue3-vite'
import DividerShadcn from './Divider.shadcn.vue'
import Divider from './Divider.vue'
import DividerVuetify from './Divider.vuetify.vue'

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

/**
 * Side-by-side обеих реализаций (vuetify / shadcn) для визуальной
 * проверки во время Фазы 2.7 миграции. После переключения default
 * на shadcn и удаления vuetify-версии этот story удалится.
 */
export const SideBySide: Story = {
  name: 'Side-by-side (vuetify / shadcn)',
  render: () => ({
    components: { DividerVuetify, DividerShadcn },
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">vuetify · horizontal</div>
          <div style="${wrap}">
            <div>Сверху</div>
            <DividerVuetify />
            <div>Снизу</div>
          </div>
        </div>
        <div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">shadcn · horizontal</div>
          <div style="${wrap}">
            <div>Сверху</div>
            <DividerShadcn />
            <div>Снизу</div>
          </div>
        </div>
        <div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">vuetify · vertical</div>
          <div style="${wrap} display: flex; align-items: center; gap: 12px; height: 60px;">
            <div>Слева</div>
            <DividerVuetify vertical />
            <div>Справа</div>
          </div>
        </div>
        <div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">shadcn · vertical</div>
          <div style="${wrap} display: flex; align-items: center; gap: 12px; height: 60px;">
            <div>Слева</div>
            <DividerShadcn vertical />
            <div>Справа</div>
          </div>
        </div>
      </div>
    `,
  }),
}
