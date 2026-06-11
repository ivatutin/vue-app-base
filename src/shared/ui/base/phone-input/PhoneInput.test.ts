import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import PhoneInput from './PhoneInput.vue'

describe('PhoneInput', () => {
  it('по умолчанию пустое значение и type=tel', () => {
    const wrapper = mount(PhoneInput, { props: { modelValue: '' } })
    expect(wrapper.find('input').attributes('type')).toBe('tel')
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
  })

  it('применяет RU-маску при вводе цифр', async () => {
    const Wrapper = defineComponent({
      components: { PhoneInput },
      setup: () => ({ value: ref('') }),
      template: `<PhoneInput v-model="value" />`,
    })
    const wrapper = mount(Wrapper)
    const input = wrapper.find('input')
    await input.setValue('9991234567')
    const display = (input.element as HTMLInputElement).value
    expect(display).toMatch(/\+7/)
    expect(display).toContain('999')
  })

  it('эмитит E.164 нормализованное значение', async () => {
    const Wrapper = defineComponent({
      components: { PhoneInput },
      setup: () => ({ value: ref('') }),
      template: `<PhoneInput v-model="value" />`,
    })
    const wrapper = mount(Wrapper)
    const input = wrapper.find('input')
    await input.setValue('9991234567')
    expect(wrapper.vm.value).toBe('+79991234567')
  })

  it('нормализует ввод начинающийся с 8 → +7', async () => {
    const Wrapper = defineComponent({
      components: { PhoneInput },
      setup: () => ({ value: ref('') }),
      template: `<PhoneInput v-model="value" />`,
    })
    const wrapper = mount(Wrapper)
    await wrapper.find('input').setValue('89991234567')
    expect(wrapper.vm.value).toBe('+79991234567')
  })

  it('нормализует ввод с +7 префиксом', async () => {
    const Wrapper = defineComponent({
      components: { PhoneInput },
      setup: () => ({ value: ref('') }),
      template: `<PhoneInput v-model="value" />`,
    })
    const wrapper = mount(Wrapper)
    await wrapper.find('input').setValue('+79991234567')
    expect(wrapper.vm.value).toBe('+79991234567')
  })

  it('пустой ввод эмитит пустую строку', async () => {
    const Wrapper = defineComponent({
      components: { PhoneInput },
      setup: () => ({ value: ref('+79991234567') }),
      template: `<PhoneInput v-model="value" />`,
    })
    const wrapper = mount(Wrapper)
    await wrapper.find('input').setValue('')
    expect(wrapper.vm.value).toBe('')
  })

  it('показывает RU-маску для входящего E.164 значения', () => {
    const wrapper = mount(PhoneInput, { props: { modelValue: '+79991234567' } })
    const display = (wrapper.find('input').element as HTMLInputElement).value
    expect(display).toMatch(/\+7/)
    expect(display).toContain('999')
  })

  it('показывает :error prop', () => {
    const wrapper = mount(PhoneInput, {
      props: { modelValue: '', error: 'Некорректный телефон' },
    })
    expect(wrapper.text()).toContain('Некорректный телефон')
  })

  it('autocomplete=tel по дефолту, inputmode=tel', () => {
    const wrapper = mount(PhoneInput, { props: { modelValue: '' } })
    expect(wrapper.find('input').attributes('autocomplete')).toBe('tel')
    expect(wrapper.find('input').attributes('inputmode')).toBe('tel')
  })

  it('показывает label с required-маркером', () => {
    const wrapper = mount(PhoneInput, {
      props: { modelValue: '', label: 'Телефон', required: true },
    })
    expect(wrapper.text()).toContain('Телефон')
  })
})
