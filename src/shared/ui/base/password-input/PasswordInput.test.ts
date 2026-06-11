import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import PasswordInput from './PasswordInput.vue'

describe('PasswordInput', () => {
  it('по умолчанию type=password', () => {
    const wrapper = mount(PasswordInput, { props: { modelValue: '' } })
    expect(wrapper.find('input').attributes('type')).toBe('password')
  })

  it('переключает type на text при клике на eye-toggle', async () => {
    const wrapper = mount(PasswordInput, { props: { modelValue: 'secret' } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('text')
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('input').attributes('type')).toBe('password')
  })

  it('эмитит update:modelValue при вводе', async () => {
    const wrapper = mount(PasswordInput, { props: { modelValue: '' } })
    await wrapper.find('input').setValue('mypassword')
    expect(wrapper.emitted('update:modelValue')![0]).toEqual(['mypassword'])
  })

  it('показывает strength meter при show-strength + value', async () => {
    const Wrapper = defineComponent({
      components: { PasswordInput },
      setup: () => ({ value: ref('correct-horse-battery-staple') }),
      template: `<PasswordInput v-model="value" show-strength />`,
    })
    const wrapper = mount(Wrapper)
    expect(wrapper.text()).toContain('Хороший')
  })

  it('не показывает strength meter без show-strength', () => {
    const wrapper = mount(PasswordInput, { props: { modelValue: 'anything' } })
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('не показывает strength meter с пустым value даже при show-strength', () => {
    const wrapper = mount(PasswordInput, { props: { modelValue: '', showStrength: true } })
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it('autocomplete=new-password по дефолту', () => {
    const wrapper = mount(PasswordInput, { props: { modelValue: '' } })
    expect(wrapper.find('input').attributes('autocomplete')).toBe('new-password')
  })

  it('можно переопределить autocomplete для логин-формы', () => {
    const wrapper = mount(PasswordInput, {
      props: { modelValue: '', autocomplete: 'current-password' },
    })
    expect(wrapper.find('input').attributes('autocomplete')).toBe('current-password')
  })

  it('показывает :error prop', () => {
    const wrapper = mount(PasswordInput, {
      props: { modelValue: 'x', error: 'Слабый пароль' },
    })
    expect(wrapper.text()).toContain('Слабый пароль')
  })

  it('маркирует aria-pressed на toggle button', async () => {
    const wrapper = mount(PasswordInput, { props: { modelValue: 'x' } })
    const btn = wrapper.find('button')
    expect(btn.attributes('aria-pressed')).toBe('false')
    await btn.trigger('click')
    expect(btn.attributes('aria-pressed')).toBe('true')
  })

  it('strength score: short = "Очень слабый"', () => {
    const wrapper = mount(PasswordInput, {
      props: { modelValue: 'short', showStrength: true },
    })
    expect(wrapper.text()).toContain('Очень слабый')
  })

  it('strength score: 12+ chars с разнообразием = "Хороший"+', () => {
    const wrapper = mount(PasswordInput, {
      props: { modelValue: 'Aa1!Aa1!Aa1!', showStrength: true },
    })
    expect(wrapper.text()).toMatch(/Хороший|Сильный/)
  })
})
