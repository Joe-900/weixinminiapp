/**
 * @file 统一信封封装函数
 * @description 所有云函数返回统一信封格式 { code, message, data }
 */

import { ErrorCode, ERROR_MESSAGE_MAP } from '../../../src/types/common'
import type { ApiResponse } from '../../../src/types/common'

export function success<T>(data: T, message = '成功'): ApiResponse<T> {
  return { code: ErrorCode.SUCCESS, message, data }
}

export function fail<T = null>(code: ErrorCode, message?: string): ApiResponse<T> {
  return {
    code,
    message: message ?? ERROR_MESSAGE_MAP[code] ?? '未知错误',
    data: null,
  }
}
