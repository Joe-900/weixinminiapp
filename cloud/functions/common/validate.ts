/**
 * @file 入参校验工具函数
 * @description 统一的入参校验逻辑，缺失或类型错误返回 1003
 */

import { ErrorCode } from '../../src/types/common'
import type { ApiResponse } from '../../src/types/common'

interface FieldRule {
  name: string
  type: 'string' | 'number' | 'boolean'
  required: boolean
}

export function validateParams(
  params: Record<string, unknown>,
  rules: FieldRule[],
): ApiResponse<null> | null {
  for (const rule of rules) {
    const value = params[rule.name]

    if (rule.required && (value === undefined || value === null || value === '')) {
      return {
        code: ErrorCode.BAD_REQUEST,
        message: `${rule.name} 字段缺失`,
        data: null,
      }
    }

    if (value !== undefined && value !== null && typeof value !== rule.type) {
      return {
        code: ErrorCode.BAD_REQUEST,
        message: `${rule.name} 字段类型错误，期望 ${rule.type}`,
        data: null,
      }
    }
  }

  return null
}
