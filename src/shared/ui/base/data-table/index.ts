export { default as DataTable } from './DataTable.vue'

// Реэкспорт хелперов движка — потребители описывают колонки, не импортируя
// @tanstack/vue-table напрямую.
export { createColumnHelper } from '@tanstack/vue-table'
export type { ColumnDef } from '@tanstack/vue-table'
