import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PhoneInput from './PhoneInput.vue'

const meta: Meta<typeof PhoneInput> = {
  title: 'shared/ui/base/PhoneInput',
  component: PhoneInput,
  args: { label: 'Телефон' },
  parameters: {
    docs: {
      description: {
        component:
          'Поле телефона с российской маской. Компонент **RU-only**: любой ввод '
          + '(`8…`, `7…`, `+7…`, `999…`) разворачивается в `+7`, международные номера '
          + 'не поддерживаются. Наружу отдаёт `+` и цифры; полным E.164 значение '
          + 'становится, когда номер донабран.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PhoneInput>

/**
 * Живой ввод: рядом видно, что уходит наружу. Полезно проверить, что
 * на любом шаге набора код страны ровно один — раньше на девятой цифре
 * появлялась вторая семёрка.
 */
export const Default: Story = {
  render: args => ({
    components: { PhoneInput },
    setup () {
      return { args, value: ref('') }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 12px; max-width: 320px;">
        <PhoneInput v-bind="args" v-model="value" />
        <code style="font-size: 12px; opacity: .7;">modelValue: "{{ value }}"</code>
      </div>
    `,
  }),
}

export const Filled: Story = {
  render: () => ({
    components: { PhoneInput },
    setup: () => ({ value: ref('+79991234567') }),
    template: '<div style="max-width: 320px;"><PhoneInput v-model="value" label="Телефон" /></div>',
  }),
}

export const WithError: Story = {
  render: () => ({
    components: { PhoneInput },
    setup: () => ({ value: ref('+7999123') }),
    template: `
      <div style="max-width: 320px;">
        <PhoneInput v-model="value" label="Телефон" error="Номер неполный" />
      </div>
    `,
  }),
}

export const Required: Story = {
  render: () => ({
    components: { PhoneInput },
    setup: () => ({ value: ref('') }),
    template: '<div style="max-width: 320px;"><PhoneInput v-model="value" label="Телефон" required /></div>',
  }),
}

export const Disabled: Story = {
  render: () => ({
    components: { PhoneInput },
    template: '<div style="max-width: 320px;"><PhoneInput label="Телефон" model-value="+79991234567" disabled /></div>',
  }),
}
