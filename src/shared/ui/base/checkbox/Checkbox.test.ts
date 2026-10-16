import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, ref } from 'vue'
import { z } from 'zod'
import Form from '../form/Form.vue'
import Checkbox from './Checkbox.vue'

describe('Checkbox', () => {
  it('рендерит подпись и не отмечен по умолчанию', () => {
    const wrapper = mount(Checkbox, { props: { label: 'Принимаю условия' } })

    expect(wrapper.text()).toContain('Принимаю условия')
    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(false)
  })

  it('v-model: клик эмитит update:modelValue', async () => {
    const wrapper = mount(Checkbox, {
      props: { modelValue: false, label: 'Да' },
    })

    await wrapper.find('input').setValue(true)
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([true])

    await wrapper.find('input').setValue(false)
    expect(wrapper.emitted('update:modelValue')![1]).toEqual([false])
  })

  it('показывает ошибку и связывает её через aria-describedby', () => {
    const wrapper = mount(Checkbox, {
      props: { modelValue: false, label: 'Да', error: 'Отметьте, чтобы продолжить' },
    })

    const input = wrapper.find('input')
    expect(wrapper.text()).toContain('Отметьте, чтобы продолжить')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe(wrapper.find('p').attributes('id'))
  })

  it('disabled блокирует флажок', () => {
    const wrapper = mount(Checkbox, { props: { modelValue: false, disabled: true, label: 'Да' } })

    expect(wrapper.find('input').attributes('disabled')).toBeDefined()
  })

  it('подпись из слота поддерживает ссылку без переключения флажка (@click.stop)', async () => {
    const Wrapper = defineComponent({
      components: { Checkbox },
      setup: () => ({ value: ref(false) }),
      template: `
        <Checkbox v-model="value">
          <span>Принимаю <a href="#" @click.stop>условия</a></span>
        </Checkbox>
      `,
    })
    const wrapper = mount(Wrapper)

    await wrapper.find('a').trigger('click')
    expect(wrapper.vm.value).toBe(false)
  })
})

/**
 * Интеграция с `<Form :schema>` — то, ради чего чекбокс и нужен на регистрации:
 * без `:name`-режима значение «принял условия» не попало бы в валидацию.
 */
describe('Checkbox внутри <Form :schema>', () => {
  /**
   * `validate()` у vee-validate асинхронна через несколько микротасков —
   * фиксированной паузы не хватает на загруженной машине (ср. Form.test.ts),
   * поэтому и ожидание, и проверки идут через `vi.waitFor`.
   */
  async function waitForVeeValidate () {
    await flushPromises()
    await new Promise(resolve => setTimeout(resolve, 0))
    await flushPromises()
  }

  function buildHarness () {
    return defineComponent({
      components: { Form, Checkbox },
      setup () {
        const submitted: unknown[] = []
        const invalid: unknown[] = []
        return {
          submitted,
          invalid,
          schema: z.object({ acceptedTerms: z.literal(true) }),
        }
      },
      template: `
        <Form
          :schema="schema"
          @submit="(v) => submitted.push(v)"
          @invalid-submit="(e) => invalid.push(e)"
        >
          <Checkbox name="acceptedTerms" label="Принимаю условия" />
          <button type="submit">Submit</button>
        </Form>
      `,
    })
  }

  it('после отметки submit отдаёт значения схемы', async () => {
    const wrapper = mount(buildHarness())
    await waitForVeeValidate()

    await wrapper.find('input').setValue(true)
    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => {
      expect(wrapper.vm.submitted).toHaveLength(1)
    })

    expect(wrapper.vm.submitted[0]).toEqual({ acceptedTerms: true })
    expect(wrapper.vm.invalid).toHaveLength(0)
  })

  it('без отметки submit не проходит валидацию', async () => {
    const wrapper = mount(buildHarness())
    await waitForVeeValidate()

    await wrapper.find('form').trigger('submit')

    await vi.waitFor(() => {
      expect(wrapper.vm.invalid).toHaveLength(1)
    })

    expect(wrapper.vm.submitted).toHaveLength(0)
    expect(wrapper.findAll('p.text-error').length).toBeGreaterThan(0)
  })
})
