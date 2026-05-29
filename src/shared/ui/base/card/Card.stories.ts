import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Button } from '../button'
import CardShadcn from './Card.shadcn.vue'
import Card from './Card.vue'
import CardVuetify from './Card.vuetify.vue'

const meta: Meta<typeof Card> = {
  title: 'shared/ui/base/Card',
  component: Card,
}

export default meta
type Story = StoryObj<typeof Card>

export const FullCard: Story = {
  render: () => ({
    components: { Card, Button },
    template: `
      <Card width="400" title="Заголовок">
        Содержимое карточки. Можно несколько строк, всё что угодно.
        <template #footer>
          <Button variant="text">Отмена</Button>
          <Button>Сохранить</Button>
        </template>
      </Card>
    `,
  }),
}

export const TitleOnly: Story = {
  render: () => ({
    components: { Card },
    template: '<Card width="400" title="Только заголовок" />',
  }),
}

export const BodyOnly: Story = {
  render: () => ({
    components: { Card },
    template: '<Card width="400">Только тело без header и footer.</Card>',
  }),
}

/**
 * Side-by-side: vuetify v-card vs shadcn custom div+Tailwind.
 * Структура (header → body → footer с divider) совпадает.
 * Цвета — общие tokens (surface/border).
 */
export const SideBySide: Story = {
  name: 'Side-by-side (vuetify / shadcn)',
  render: () => ({
    components: { CardVuetify, CardShadcn, Button },
    template: `
      <div style="display: flex; gap: 24px; align-items: flex-start;">
        <div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">vuetify</div>
          <CardVuetify width="320" title="Заголовок">
            Содержимое карточки. Можно несколько строк.
            <template #footer>
              <Button variant="text">Отмена</Button>
              <Button>Сохранить</Button>
            </template>
          </CardVuetify>
        </div>
        <div>
          <div style="font-size: 12px; color: #71717a; margin-bottom: 8px;">shadcn</div>
          <CardShadcn width="320" title="Заголовок">
            Содержимое карточки. Можно несколько строк.
            <template #footer>
              <Button variant="text">Отмена</Button>
              <Button>Сохранить</Button>
            </template>
          </CardShadcn>
        </div>
      </div>
    `,
  }),
}
