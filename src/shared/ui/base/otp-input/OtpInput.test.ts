import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import OtpInput from './OtpInput.vue'

describe('OtpInput', () => {
  it('рендерит 6 segment-input по умолчанию', () => {
    const wrapper = mount(OtpInput, { props: { modelValue: '' } })
    expect(wrapper.findAll('input')).toHaveLength(6)
  })

  it('заполняет cells из modelValue', async () => {
    const Wrapper = defineComponent({
      components: { OtpInput },
      setup: () => ({ value: ref('1234') }),
      template: `<OtpInput v-model="value" />`,
    })
    const wrapper = mount(Wrapper)
    const inputs = wrapper.findAll('input')
    expect((inputs[0]!.element as HTMLInputElement).value).toBe('1')
    expect((inputs[3]!.element as HTMLInputElement).value).toBe('4')
    expect((inputs[4]!.element as HTMLInputElement).value).toBe('')
  })

  it('эмитит update:modelValue при вводе цифры', async () => {
    const wrapper = mount(OtpInput, { props: { modelValue: '' } })
    const first = wrapper.findAll('input')[0]!
    await first.setValue('5')
    const emits = wrapper.emitted('update:modelValue')
    expect(emits).toBeTruthy()
    expect(emits![0]).toEqual(['5'])
  })

  it('игнорирует нецифры (буквы) в input', async () => {
    const wrapper = mount(OtpInput, { props: { modelValue: '' } })
    const first = wrapper.findAll('input')[0]!
    await first.setValue('a')
    expect((first.element as HTMLInputElement).value).toBe('')
  })

  it('paste 6-digit code заполняет все segments', async () => {
    const wrapper = mount(OtpInput, { props: { modelValue: '' } })
    const container = wrapper.find('div.flex')
    const event = new ClipboardEvent('paste', { clipboardData: new DataTransfer() })
    event.clipboardData!.setData('text', '123456')
    container.element.dispatchEvent(event)
    await wrapper.vm.$nextTick()
    const emits = wrapper.emitted('update:modelValue')
    expect(emits).toBeTruthy()
    const last = emits!.at(-1)
    expect(last).toEqual(['123456'])
  })

  it('эмитит complete когда заполнен весь код', async () => {
    const Wrapper = defineComponent({
      components: { OtpInput },
      setup: () => ({ value: ref('') }),
      template: `<OtpInput v-model="value" />`,
    })
    const wrapper = mount(Wrapper)
    const container = wrapper.find('div.flex')
    const event = new ClipboardEvent('paste', { clipboardData: new DataTransfer() })
    event.clipboardData!.setData('text', '987654')
    container.element.dispatchEvent(event)
    await wrapper.vm.$nextTick()
    const completed = wrapper.findComponent(OtpInput).emitted('complete')
    expect(completed).toBeTruthy()
    expect(completed![0]).toEqual(['987654'])
  })

  it('показывает :error prop', () => {
    const wrapper = mount(OtpInput, {
      props: { modelValue: '', error: 'Неверный код' },
    })
    expect(wrapper.text()).toContain('Неверный код')
  })

  it('применяет maxlength=1 и inputmode=numeric для каждого segment', () => {
    const wrapper = mount(OtpInput, { props: { modelValue: '' } })
    for (const input of wrapper.findAll('input')) {
      expect(input.attributes('maxlength')).toBe('1')
      expect(input.attributes('inputmode')).toBe('numeric')
    }
  })

  it('autocomplete=one-time-code только на первом segment', () => {
    const wrapper = mount(OtpInput, { props: { modelValue: '' } })
    const inputs = wrapper.findAll('input')
    expect(inputs[0]!.attributes('autocomplete')).toBe('one-time-code')
    expect(inputs[1]!.attributes('autocomplete')).toBe('off')
  })

  it('поддерживает кастомную длину через :length', () => {
    const wrapper = mount(OtpInput, { props: { modelValue: '', length: 4 } })
    expect(wrapper.findAll('input')).toHaveLength(4)
  })
})
