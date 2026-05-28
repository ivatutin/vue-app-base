import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Button } from '../button'
import Card from './Card.vue'

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
