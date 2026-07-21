import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import ListItem from './ListItem.vue'

function createTestRouter () {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/auth/logout', name: '/auth/logout', component: { template: '<div />' } },
    ],
  })
}

async function mountItem (props: Record<string, unknown>) {
  const router = createTestRouter()
  await router.push('/')
  await router.isReady()
  return mount(ListItem, { props, global: { plugins: [router] } })
}

describe('ListItem — выбор тега по props', () => {
  it('без to/href рендерит button', async () => {
    const wrapper = await mountItem({ title: 'Действие' })
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.find('button').attributes('type')).toBe('button')
  })

  it('с href рендерит обычную ссылку', async () => {
    const wrapper = await mountItem({ title: 'Внешняя', href: 'https://example.com' })
    expect(wrapper.find('a').attributes('href')).toBe('https://example.com')
  })

  it('disabled проставляется только на button', async () => {
    const wrapper = await mountItem({ title: 'Действие', disabled: true })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})

/**
 * Регрессия: компонент биндил `:href="tag === 'a' ? href : undefined"`
 * и на RouterLink уходил явный `href: undefined`. Fallthrough-атрибуты
 * применяются поверх собственных props корневого элемента, поэтому
 * href, который RouterLink проставляет сам, **стирался**.
 *
 * Клик при этом продолжал работать (обработчик навигации на месте),
 * из-за чего баг не замечали. Но ссылка теряла адрес: Ctrl+клик,
 * «открыть в новой вкладке», «копировать адрес ссылки» и скринридер
 * переставали работать. Найдено проверкой пункта «Выйти» в браузере.
 */
describe('ListItem — RouterLink сохраняет href', () => {
  it('с to рендерит ссылку С адресом, а не пустой <a>', async () => {
    const wrapper = await mountItem({ title: 'Выйти', to: { name: '/auth/logout' } })

    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/auth/logout')
  })

  it('принимает to строкой', async () => {
    const wrapper = await mountItem({ title: 'Домой', to: '/' })
    expect(wrapper.find('a').attributes('href')).toBe('/')
  })

  it('не протаскивает disabled-атрибут на ссылку', async () => {
    // disabled — валидный атрибут только для button; на <a> он ничего
    // не делает и вводит в заблуждение при отладке.
    const wrapper = await mountItem({ title: 'Выйти', to: '/', disabled: true })
    expect(wrapper.find('a').attributes('disabled')).toBeUndefined()
  })
})
