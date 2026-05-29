import type { Meta, StoryObj } from '@storybook/vue3-vite'
import IconShadcn from './Icon.shadcn.vue'
import Icon from './Icon.vue'
import IconVuetify from './Icon.vuetify.vue'

const meta: Meta<typeof Icon> = {
  title: 'shared/ui/base/Icon',
  component: Icon,
  argTypes: {
    size: { control: 'select', options: ['sm', 'md', 'lg', 'xl'] },
  },
  args: {
    name: 'mdi-account',
    size: 'md',
  },
}

export default meta
type Story = StoryObj<typeof Icon>

const NAMES = [
  'mdi-account',
  'mdi-account-edit-outline',
  'mdi-shield',
  'mdi-pencil-ruler',
  'mdi-view-dashboard-outline',
  'mdi-dots-vertical',
  'mdi-unfold-more-vertical',
  'mdi-unfold-less-vertical',
  'mdi-weather-night',
  'mdi-white-balance-sunny',
  'mdi-exit-run',
  'mdi-close',
  'mdi-pencil',
  'mdi-delete',
  'mdi-content-save',
  'mdi-content-copy',
  'mdi-cog',
  'mdi-chevron-double-up',
  'mdi-xml',
] as const

const cellStyle
  = 'display: flex; flex-direction: column; align-items: center; gap: 6px; '
    + 'padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px; min-width: 80px;'
const labelStyle = 'font-size: 10px; color: #71717a; text-align: center;'

export const Single: Story = {
  render: args => ({
    components: { Icon },
    setup: () => ({ args }),
    template: '<Icon v-bind="args" />',
  }),
}

export const Sizes: Story = {
  render: () => ({
    components: { Icon },
    template: `
      <div style="display: flex; gap: 16px; align-items: center;">
        <Icon name="mdi-account" size="sm" />
        <Icon name="mdi-account" size="md" />
        <Icon name="mdi-account" size="lg" />
        <Icon name="mdi-account" size="xl" />
      </div>
    `,
  }),
}

export const AllNames: Story = {
  render: () => ({
    components: { Icon },
    setup: () => ({ names: NAMES, cellStyle, labelStyle }),
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        <div v-for="name in names" :key="name" :style="cellStyle">
          <Icon :name="name" size="lg" />
          <div :style="labelStyle">{{ name }}</div>
        </div>
      </div>
    `,
  }),
}

/**
 * Side-by-side: vuetify (MDI font) vs shadcn (lucide SVG).
 * Lucide-иконки тонкие и stroke-based, MDI — filled — небольшие
 * визуальные отличия ожидаемы. Проверяй семантическое совпадение.
 */
export const SideBySide: Story = {
  name: 'Side-by-side (vuetify / shadcn)',
  render: () => ({
    components: { IconVuetify, IconShadcn },
    setup: () => ({ names: NAMES, cellStyle, labelStyle }),
    template: `
      <div style="display: flex; flex-direction: column; gap: 24px;">
        <div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">vuetify · MDI font</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <div v-for="name in names" :key="'v-' + name" :style="cellStyle">
              <IconVuetify :name="name" size="lg" />
              <div :style="labelStyle">{{ name }}</div>
            </div>
          </div>
        </div>
        <div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">shadcn · lucide SVG</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <div v-for="name in names" :key="'s-' + name" :style="cellStyle">
              <IconShadcn :name="name" size="lg" />
              <div :style="labelStyle">{{ name }}</div>
            </div>
          </div>
        </div>
      </div>
    `,
  }),
}
