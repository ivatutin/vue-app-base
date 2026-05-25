import type { PermissionCode } from '@/shared/model/permission'

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    noAuth?: boolean
    permissions?: PermissionCode[]
  }
}
