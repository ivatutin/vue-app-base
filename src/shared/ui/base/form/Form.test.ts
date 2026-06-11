import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { z } from 'zod'
import TextField from '../text-field/TextField.vue'
import Form from './Form.vue'

const schema = z.object({
  email: z.email('Некорректный email'),
  password: z.string().min(12, 'Минимум 12 символов'),
})

/**
 * vee-validate validate() — async через несколько микротасков. flushPromises
 * один раз не достаточно — нужно дождаться render-cycle + validate-cycle.
 */
async function waitForVeeValidate () {
  await flushPromises()
  await new Promise(r => setTimeout(r, 0))
  await flushPromises()
}

function buildHarness () {
  return defineComponent({
    components: { Form, TextField },
    setup () {
      const submitted: { values?: unknown }[] = []
      const invalid: { errors?: unknown }[] = []
      return { submitted, invalid, schema }
    },
    template: `
      <Form :schema="schema" @submit="(v) => submitted.push({ values: v })" @invalid-submit="(e) => invalid.push({ errors: e })">
        <TextField name="email" label="Email" />
        <TextField name="password" label="Password" type="password" />
        <button type="submit">Submit</button>
      </Form>
    `,
  })
}

describe('Form + TextField (vee-validate + Zod)', () => {
  it('передаёт валидированные values в emit(submit)', async () => {
    const wrapper = mount(buildHarness())
    await waitForVeeValidate()
    const inputs = wrapper.findAll('input')

    await inputs[0]!.setValue('user@example.com')
    await waitForVeeValidate()
    await inputs[1]!.setValue('correct-horse-battery-staple')
    await waitForVeeValidate()

    await wrapper.find('form').trigger('submit')
    await waitForVeeValidate()

    expect(wrapper.vm.submitted).toHaveLength(1)
    expect(wrapper.vm.submitted[0]!.values).toEqual({
      email: 'user@example.com',
      password: 'correct-horse-battery-staple',
    })
    expect(wrapper.vm.invalid).toHaveLength(0)
  })

  it('блокирует submit при невалидных полях и emit invalidSubmit', async () => {
    const wrapper = mount(buildHarness())
    const inputs = wrapper.findAll('input')

    await inputs[0]!.setValue('not-an-email')
    await inputs[1]!.setValue('short')
    await waitForVeeValidate()

    await wrapper.find('form').trigger('submit')
    await waitForVeeValidate()

    expect(wrapper.vm.submitted).toHaveLength(0)
    expect(wrapper.vm.invalid).toHaveLength(1)
    const errorMsgs = wrapper.findAll('p.text-error').map(p => p.text())
    expect(errorMsgs.length).toBeGreaterThan(0)
  })

  it('показывает ошибку поля на blur', async () => {
    const wrapper = mount(buildHarness())
    const emailInput = wrapper.findAll('input')[0]!

    await emailInput.setValue('not-an-email')
    await emailInput.trigger('blur')
    await waitForVeeValidate()

    expect(wrapper.text()).toContain('Некорректный email')
  })

  it('setFieldError через defineExpose ставит ошибку поля', async () => {
    const Wrapper = defineComponent({
      components: { Form, TextField },
      setup () {
        const formRef = ref<{ setFieldError: (f: string, m: string) => void } | null>(null)
        return { formRef, schema }
      },
      template: `
        <Form ref="formRef" :schema="schema">
          <TextField name="email" label="Email" />
          <TextField name="password" label="Password" />
        </Form>
      `,
    })
    const wrapper = mount(Wrapper)
    await waitForVeeValidate()
    wrapper.vm.formRef!.setFieldError('email', 'Email уже занят')
    await nextTick()
    expect(wrapper.text()).toContain('Email уже занят')
  })
})

describe('Form без :schema (legacy thin mode)', () => {
  it('emit submit без аргументов и не падает', async () => {
    const Wrapper = defineComponent({
      components: { Form },
      setup () {
        const called: number[] = []
        return { called }
      },
      template: `
        <Form @submit="called.push(1)">
          <button type="submit">Go</button>
        </Form>
      `,
    })
    const wrapper = mount(Wrapper)
    await wrapper.find('form').trigger('submit')
    expect(wrapper.vm.called).toHaveLength(1)
  })
})

describe('TextField без :name (fallback на v-model)', () => {
  it('работает как controlled input без Form', async () => {
    const Wrapper = defineComponent({
      components: { TextField },
      setup () {
        const value = ref('')
        return { value }
      },
      template: `<TextField v-model="value" label="Plain" />`,
    })
    const wrapper = mount(Wrapper)
    const input = wrapper.find('input')
    await input.setValue('hello')
    expect(wrapper.vm.value).toBe('hello')
  })

  it('показывает :error prop как fallback', () => {
    const Wrapper = defineComponent({
      components: { TextField },
      template: `<TextField model-value="x" label="L" error="custom error" />`,
    })
    const wrapper = mount(Wrapper)
    expect(wrapper.text()).toContain('custom error')
  })
})

describe('TextField :name без Form-context (dev-warn + fallback)', () => {
  it('предупреждает в console и работает через v-model', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Wrapper = defineComponent({
      components: { TextField },
      setup () {
        const value = ref('')
        return { value }
      },
      template: `<TextField name="orphan" v-model="value" label="Orphan" />`,
    })
    const wrapper = mount(Wrapper)
    expect(warnSpy).toHaveBeenCalled()
    expect(warnSpy.mock.calls[0]![0]).toContain('orphan')

    const input = wrapper.find('input')
    await input.setValue('typed')
    expect(wrapper.vm.value).toBe('typed')

    warnSpy.mockRestore()
  })
})
