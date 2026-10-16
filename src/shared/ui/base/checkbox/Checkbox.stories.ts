import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Checkbox from './Checkbox.vue'

const meta: Meta<typeof Checkbox> = {
  title: 'shared/ui/base/Checkbox',
  component: Checkbox,
  args: { label: 'Принимаю условия использования' },
  parameters: {
    docs: {
      description: {
        component:
          'Флажок с подписью над нативным `<input type="checkbox">`. Внутри `<Form :schema>` '
          + 'передавай `:name` — значение уходит в схему формы; вне формы работает `v-model`. '
          + 'Ссылку в подписи помечай `@click.stop`, иначе клик по ней переключит флажок.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Checkbox>

export const Default: Story = {
  render: args => ({
    components: { Checkbox },
    setup: () => ({ args, value: ref(false) }),
    template: '<div style="max-width: 360px;"><Checkbox v-bind="args" v-model="value" /></div>',
  }),
}

export const Checked: Story = {
  render: args => ({
    components: { Checkbox },
    setup: () => ({ args, value: ref(true) }),
    template: '<div style="max-width: 360px;"><Checkbox v-bind="args" v-model="value" /></div>',
  }),
}

/** Внешняя ошибка валидации (режим без `<Form :schema>`). */
export const WithError: Story = {
  render: () => ({
    components: { Checkbox },
    setup: () => ({ value: ref(false) }),
    template: `
      <div style="max-width: 360px;">
        <Checkbox v-model="value" error="Отметьте, чтобы продолжить" label="Принимаю условия использования" />
      </div>
    `,
  }),
}

/** Подпись со ссылкой — `@click.stop`, чтобы клик по ссылке не переключал флажок. */
export const WithLink: Story = {
  render: () => ({
    components: { Checkbox },
    setup: () => ({ value: ref(false) }),
    template: `
      <div style="max-width: 420px;">
        <Checkbox v-model="value">
          <span>Принимаю <a class="text-brand underline" href="#" @click.stop>условия использования</a> и политику конфиденциальности</span>
        </Checkbox>
      </div>
    `,
  }),
}
