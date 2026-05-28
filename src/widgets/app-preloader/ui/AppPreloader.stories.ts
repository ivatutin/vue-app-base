import type { Meta, StoryObj } from '@storybook/vue3-vite'
import AppPreloader from './AppPreloader.vue'

/**
 * Splash-экран, показывается App.vue пока bootstrap-процесс работает
 * (status: 'initializing'). SVG-линия с stroke=currentColor наследует
 * цвет от родителя — в темной теме автоматически переключается.
 */
const meta: Meta<typeof AppPreloader> = {
  title: 'Widgets/AppPreloader',
  component: AppPreloader,
  parameters: {
    layout: 'fullscreen',
  },
}

export default meta
type Story = StoryObj<typeof AppPreloader>

export const Light: Story = {
  decorators: [
    () => ({ template: '<div style="color: rgb(var(--color-primary)); min-height: 400px;"><story/></div>' }),
  ],
}

export const Dark: Story = {
  decorators: [
    () => ({
      template:
        '<div class="dark" style="background: rgb(var(--color-background)); color: rgb(var(--color-primary)); min-height: 400px;"><story/></div>',
    }),
  ],
}
