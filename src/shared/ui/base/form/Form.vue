<script setup lang="ts" generic="TSchema extends z.ZodObject<z.ZodRawShape>">
  /**
   * Form с опциональной Zod-валидацией через vee-validate.
   *
   * Два режима:
   * - С :schema — useForm({ validationSchema: buildZodValidator(schema) }) +
   *   provide FORM_CONTEXT_KEY. Дочерние <TextField :name> подписываются
   *   через useField. На submit emit('submit', values) с уже валидированными
   *   значениями, или emit('invalid-submit', errors) если форма невалидна.
   * - Без :schema — тонкая <form @submit.prevent> обёртка. emit('submit')
   *   без аргументов. Совместимо с прежним API.
   *
   * defineExpose отдаёт form-api (setFieldError, setFieldValue, resetForm,
   * values, errors) — для page-level обработки backend-ошибок.
   *
   * Generic constraint — z.ZodObject<z.ZodRawShape>: схема формы всегда
   * объект-полей, не примитив.
   *
   * Реализация: используем form.validate() + ручной emit вместо
   * vee-validate handleSubmit. Причина — handleSubmit через DOM submit event
   * в нашей версии 4.15.1 даёт зависающий promise.
   *
   * См. ADR-0010.
   */
  import type { GenericObject } from 'vee-validate'
  import type { z } from 'zod'
  import { useForm } from 'vee-validate'
  import { provide } from 'vue'
  import { FORM_CONTEXT_KEY } from './form-context'
  import { buildZodValidator } from './zod-validator'

  const props = defineProps<{
    schema?: TSchema
    initialValues?: Partial<z.input<TSchema>>
  }>()

  const emit = defineEmits<{
    'submit': [values: z.output<TSchema>]
    'invalid-submit': [errors: Record<string, string | undefined>]
  }>()

  const form = props.schema
    ? useForm<z.input<TSchema> & GenericObject>({
      validationSchema: buildZodValidator(props.schema),
      initialValues: props.initialValues as never,
    })
    : null

  if (form) {
    provide(FORM_CONTEXT_KEY, true)
  }

  async function handleSubmit () {
    if (!form) {
      emit('submit', undefined as z.output<TSchema>)
      return
    }
    const result = await form.validate()
    if (result.valid) {
      emit('submit', { ...form.values } as z.output<TSchema>)
    } else {
      emit(
        'invalid-submit',
        result.errors as Record<string, string | undefined>,
      )
    }
  }

  defineExpose({
    setFieldError: (field: string, message: string | undefined) =>
      form?.setFieldError(field as never, message),
    setFieldValue: (field: string, value: unknown) =>
      form?.setFieldValue(field as never, value as never),
    resetForm: () => form?.resetForm(),
    values: form?.values,
    errors: form?.errors,
  })
</script>

<template>
  <form novalidate @submit.prevent="handleSubmit">
    <slot />
  </form>
</template>
