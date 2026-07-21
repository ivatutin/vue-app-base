import type { Meta, StoryObj } from '@storybook/vue3-vite'
import Tabs from './Tabs.vue'
import TabsContent from './TabsContent.vue'
import TabsList from './TabsList.vue'
import TabsTrigger from './TabsTrigger.vue'

const meta: Meta<typeof Tabs> = {
  title: 'shared/ui/base/Tabs',
  component: Tabs,
  parameters: {
    docs: {
      description: {
        component:
          'Обёртка над reka-ui Tabs. Вся клавиатурная семантика (стрелки, Home/End, '
          + 'roving tabindex, aria-роли) делегирована примитиву. Значение вкладки '
          + 'задаётся через `default-value` либо `v-model`.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Tabs>

export const Default: Story = {
  render: () => ({
    components: { Tabs, TabsList, TabsTrigger, TabsContent },
    template: `
      <Tabs default-value="account" style="max-width: 420px;">
        <TabsList>
          <TabsTrigger value="account">Аккаунт</TabsTrigger>
          <TabsTrigger value="security">Безопасность</TabsTrigger>
        </TabsList>
        <TabsContent value="account">
          <p style="font-size: 14px; padding: 12px 0;">Имя, e-mail и телефон.</p>
        </TabsContent>
        <TabsContent value="security">
          <p style="font-size: 14px; padding: 12px 0;">Пароль и активные сессии.</p>
        </TabsContent>
      </Tabs>
    `,
  }),
}

/**
 * Целевой сценарий из auth-suite: выбор способа входа. Ради него
 * компонент и заводился — LoginPage получит вкладки «E-mail»/«Телефон».
 */
export const LoginMethods: Story = {
  render: () => ({
    components: { Tabs, TabsList, TabsTrigger, TabsContent },
    setup: () => ({ method: ref('email') }),
    template: `
      <div style="max-width: 420px;">
        <Tabs v-model="method">
          <TabsList>
            <TabsTrigger value="email">E-mail</TabsTrigger>
            <TabsTrigger value="phone">Телефон</TabsTrigger>
          </TabsList>
          <TabsContent value="email">
            <p style="font-size: 14px; padding: 12px 0;">Вход по паролю.</p>
          </TabsContent>
          <TabsContent value="phone">
            <p style="font-size: 14px; padding: 12px 0;">Вход по коду из SMS.</p>
          </TabsContent>
        </Tabs>
        <code style="font-size: 12px; opacity: .7;">v-model: "{{ method }}"</code>
      </div>
    `,
  }),
}

export const ThreeTabs: Story = {
  render: () => ({
    components: { Tabs, TabsList, TabsTrigger, TabsContent },
    template: `
      <Tabs default-value="all" style="max-width: 420px;">
        <TabsList>
          <TabsTrigger value="all">Все</TabsTrigger>
          <TabsTrigger value="active">Активные</TabsTrigger>
          <TabsTrigger value="archived">Архив</TabsTrigger>
        </TabsList>
        <TabsContent value="all"><p style="font-size: 14px; padding: 12px 0;">Все записи.</p></TabsContent>
        <TabsContent value="active"><p style="font-size: 14px; padding: 12px 0;">Только активные.</p></TabsContent>
        <TabsContent value="archived"><p style="font-size: 14px; padding: 12px 0;">Архивные.</p></TabsContent>
      </Tabs>
    `,
  }),
}
