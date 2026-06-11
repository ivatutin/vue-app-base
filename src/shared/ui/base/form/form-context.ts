import type { InjectionKey } from 'vue'

/**
 * Маркер «вокруг есть наш <Form :schema>» для <TextField :name> и других
 * полей. Чисто булевый флаг — Form-state vee-validate подхватывает сам
 * через свой внутренний provide/inject.
 *
 * Назначение нашего ключа — отличить «настоящую form-окружение» от
 * случайного `useField('foo')` без родителя, чтобы выдать dev-warn и
 * graceful fallback на v-model.
 */
export const FORM_CONTEXT_KEY: InjectionKey<true> = Symbol('FormSchemaContext')
