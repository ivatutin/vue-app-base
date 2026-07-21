import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import { phoneSchema } from '@/shared/model/phone'
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

/**
 * Регрессия: до фикса `commit()` прогонял недонабранный номер через
 * `normalizePhone`, и на 9-й введённой цифре (10 цифр в строке вместе
 * с кодом) срабатывала ветка «номер без кода страны» — к `7` дописывалась
 * вторая. Наружу уходил `+779991234567`.
 *
 * Прежние тесты этого не ловили, потому что все вызывали `setValue`
 * целой строкой — то есть проверяли путь, которым пользователь не ходит.
 */
describe('PhoneInput — посимвольный ввод', () => {
  function mountModel (initial = '') {
    const Wrapper = defineComponent({
      components: { PhoneInput },
      setup: () => ({ value: ref(initial) }),
      template: `<PhoneInput v-model="value" />`,
    })
    return mount(Wrapper)
  }

  /** Печать по одной цифре: каждый раз input содержит display + новая цифра. */
  async function typeDigits (wrapper: ReturnType<typeof mountModel>, digits: string) {
    const input = wrapper.find('input')
    for (const ch of digits) {
      const current = (input.element as HTMLInputElement).value
      await input.setValue(current + ch)
    }
  }

  it('набор по одной цифре даёт тот же результат, что и вставка целиком', async () => {
    const typed = mountModel()
    await typeDigits(typed, '9991234567')

    const pasted = mountModel()
    await pasted.find('input').setValue('9991234567')

    expect(typed.vm.value).toBe('+79991234567')
    expect(typed.vm.value).toBe(pasted.vm.value)
  })

  it('ни на одном шаге набора не появляется лишняя семёрка', async () => {
    const wrapper = mountModel()
    const input = wrapper.find('input')

    for (const ch of '9991234567') {
      const current = (input.element as HTMLInputElement).value
      await input.setValue(current + ch)

      // Инвариант: ровно один код страны в любой момент времени.
      expect(wrapper.vm.value).toMatch(/^\+7\d{0,10}$/)
      expect(wrapper.vm.value.startsWith('+77')).toBe(false)
    }
  })

  it('недонабранный номер не проходит валидацию схемы', async () => {
    const wrapper = mountModel()
    const input = wrapper.find('input')

    // 9 цифр из 10 — номер заведомо неполный
    for (const ch of '999123456') {
      const current = (input.element as HTMLInputElement).value
      await input.setValue(current + ch)
    }

    // Проверяем реальным валидатором, а не его копией: раньше
    // недобор проходил, потому что regex допускал 10-15 цифр.
    expect(phoneSchema.safeParse(wrapper.vm.value).success).toBe(false)

    await input.setValue((input.element as HTMLInputElement).value + '7')
    expect(phoneSchema.safeParse(wrapper.vm.value).success).toBe(true)
  })

  it('стирание цифр не портит значение', async () => {
    const wrapper = mountModel()
    const input = wrapper.find('input')
    await typeDigits(wrapper, '9991234567')

    // Backspace по цифрам: срезаем хвост display'а
    for (let i = 0; i < 4; i++) {
      const current = (input.element as HTMLInputElement).value
      await input.setValue(current.slice(0, -1))
      expect(wrapper.vm.value).toMatch(/^\+7\d{0,10}$/)
    }
  })

  it('донабор после внешней установки значения не удваивает код', async () => {
    const wrapper = mountModel('+7999123456')
    const input = wrapper.find('input')
    const current = (input.element as HTMLInputElement).value

    await input.setValue(current + '7')

    expect(wrapper.vm.value).toBe('+79991234567')
  })
})
