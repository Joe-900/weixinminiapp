/**
 * @file 错误码常量与错误创建函数
 * @description 统一错误码定义，与前端 types/common.ts 保持一致
 */

import { ErrorCode } from '../../src/types/common'
import type { ApiResponse } from '../../src/types/common'

export { ErrorCode } from '../../src/types/common'

export function createError(code: ErrorCode, customMessage?: string): ApiResponse<null> {
  const ERROR_MESSAGES: Record<number, string> = {
    [ErrorCode.SUCCESS]: '成功',
    [ErrorCode.UNAUTHORIZED]: '未登录或身份无效',
    [ErrorCode.FORBIDDEN]: '权限不足',
    [ErrorCode.BAD_REQUEST]: '入参缺失或非法',
    [ErrorCode.NOT_FOUND]: '资源不存在',
    [ErrorCode.ACCESS_DENIED]: '越权访问',
    [ErrorCode.AI_ERROR]: '大模型调用失败',
    [ErrorCode.AI_LIMIT]: '触发用量限制',
    [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  }

  return {
    code,
    message: customMessage ?? ERROR_MESSAGES[code] ?? '未知错误',
    data: null,
  }
}
