import type { PermissionCode } from '@/shared/model/permission'
// Относительный путь, а не '@/entities/user': импорт собственного
// barrel'а слайса даёт рантайм-цикл index.ts → lib/can.ts → index.ts.
// Сейчас он не взрывается только потому, что useUserStore() вызывается
// лениво внутри функции.
import { useUserStore } from '../model/user.store'

export function can (permission: PermissionCode): boolean {
  return useUserStore().hasPermission(permission)
}
