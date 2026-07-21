import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import Button from './Button.vue'

function createTestRouter () {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'home', component: { template: '<div />' } },
      { path: '/auth/login', name: '/auth/login', component: { template: '<div />' } },
    ],
  })
}

async function mountButton (props: Record<string, unknown> = {}, slot = 'Текст') {
  const router = createTestRouter()
  await router.push('/')
  await router.isReady()
  return mount(Button, { props, slots: { default: slot }, global: { plugins: [router] } })
}

describe('Button', () => {
  it('по умолчанию рендерит button[type=button]', async () => {
    const wrapper = await mountButton()
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.attributes('type')).toBe('button')
  })

  it('disabled и loading блокируют кнопку', async () => {
    expect((await mountButton({ disabled: true })).find('button').attributes('disabled')).toBeDefined()
    expect((await mountButton({ loading: true })).find('button').attributes('disabled')).toBeDefined()
  })

  it('loading выставляет aria-busy', async () => {
    const wrapper = await mountButton({ loading: true })
    expect(wrapper.find('button').attributes('aria-busy')).toBe('true')
  })
})

/**
 * Кнопка, ведущая на другой экран, обязана быть ссылкой: иначе теряются
 * Ctrl+клик, «открыть в новой вкладке», «копировать адрес» и адрес для
 * скринридера. Ровно этот дефект был найден в `ListItem` — там `href`
 * затирался явным `undefined` из fallthrough-атрибутов.
 */
describe('Button с :to — навигация ссылкой', () => {
  it('рендерит <a> с реальным href', async () => {
    const wrapper = await mountButton({ to: { name: '/auth/login' } }, 'Войти')

    const link = wrapper.find('a')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/auth/login')
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('принимает to строкой', async () => {
    const wrapper = await mountButton({ to: '/auth/login' }, 'Войти')
    expect(wrapper.find('a').attributes('href')).toBe('/auth/login')
  })

  it('не протаскивает button-атрибуты на ссылку', async () => {
    const wrapper = await mountButton({ to: '/auth/login' }, 'Войти')
    const link = wrapper.find('a')
    expect(link.attributes('type')).toBeUndefined()
    expect(link.attributes('disabled')).toBeUndefined()
  })

  it('disabled на ссылке выражается через aria-disabled', async () => {
    // `disabled` не работает на <a>, поэтому состояние передаём
    // семантически и гасим клики классом.
    const wrapper = await mountButton({ to: '/auth/login', disabled: true }, 'Войти')
    const link = wrapper.find('a')
    expect(link.attributes('aria-disabled')).toBe('true')
    expect(link.classes().join(' ')).toContain('pointer-events-none')
  })

  it('сохраняет вариантные классы', async () => {
    const wrapper = await mountButton({ to: '/auth/login', variant: 'brand' }, 'Войти')
    expect(wrapper.find('a').classes().join(' ')).toContain('bg-brand')
  })
})
