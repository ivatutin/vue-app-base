import type { Meta, StoryObj } from '@storybook/vue3-vite'
import OtpInput from './OtpInput.vue'

const meta: Meta<typeof OtpInput> = {
  title: 'shared/ui/base/OtpInput',
  component: OtpInput,
  args: { length: 6 },
  parameters: {
    docs: {
      description: {
        component:
          'Посегментный ввод одноразового кода. Поддерживает вставку кода целиком, '
          + 'переход между ячейками стрелками и Backspace, WebOTP API для автозаполнения '
          + 'из SMS на Android. На iOS WebOTP не работает — там срабатывает нативное '
          + 'предложение клавиатуры через autocomplete="one-time-code".',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof OtpInput>

export const Default: Story = {
  render: args => ({
    components: { OtpInput },
    setup () {
      const value = ref('')
      return { args, value }
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <OtpInput v-bind="args" v-model="value" />
        <code style="font-size: 12px; opacity: .7;">modelValue: "{{ value }}"</code>
      </div>
    `,
  }),
}

export const Filled: Story = {
  render: () => ({
    components: { OtpInput },
    setup: () => ({ value: ref('123456') }),
    template: '<OtpInput v-model="value" />',
  }),
}

export const WithError: Story = {
  render: () => ({
    components: { OtpInput },
    setup: () => ({ value: ref('123456') }),
    template: '<OtpInput v-model="value" error="Неверный код. Осталось 2 попытки" />',
  }),
}

export const Disabled: Story = {
  render: () => ({
    components: { OtpInput },
    template: '<OtpInput model-value="1234" disabled />',
  }),
}

/** Длина задаётся пропом: 4 цифры — частый вариант для SMS. */
export const FourDigits: Story = {
  render: () => ({
    components: { OtpInput },
    setup: () => ({ value: ref('') }),
    template: '<OtpInput v-model="value" :length="4" />',
  }),
}
