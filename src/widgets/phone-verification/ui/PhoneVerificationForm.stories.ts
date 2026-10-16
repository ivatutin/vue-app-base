import type { Meta, StoryObj } from '@storybook/vue3-vite'
import PhoneVerificationForm from './PhoneVerificationForm.vue'

const meta: Meta<typeof PhoneVerificationForm> = {
  title: 'widgets/phone-verification/PhoneVerificationForm',
  component: PhoneVerificationForm,
  args: { purpose: 'sign-up', requireTerms: true, submitLabel: 'Создать аккаунт' },
  parameters: {
    docs: {
      description: {
        component:
          'Шаг «телефон → код → `verificationToken`»: используется и на регистрации '
          + '(`purpose: "sign-up"`), и на входе (`"sign-in"`). Состояние челленджа живёт в '
          + '`useOtpChallengeStore`. Нажатие «Получить код» идёт на **живой** API — в Storybook '
          + 'без поднятого стенда в алерте будет сетевая ошибка, это ожидаемо.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PhoneVerificationForm>

export const SignUp: Story = {
  render: args => ({
    components: { PhoneVerificationForm },
    setup: () => ({ args }),
    template: '<div style="max-width: 380px;"><PhoneVerificationForm v-bind="args" /></div>',
  }),
}

/** Вход по телефону: без чекбокса условий. */
export const SignIn: Story = {
  args: { purpose: 'sign-in', requireTerms: false, submitLabel: 'Получить код' },
  render: args => ({
    components: { PhoneVerificationForm },
    setup: () => ({ args }),
    template: '<div style="max-width: 380px;"><PhoneVerificationForm v-bind="args" /></div>',
  }),
}
