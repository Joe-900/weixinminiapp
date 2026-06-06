/**
 * @file Param validation utility
 * @description Unified param validation logic, missing or wrong type returns 1003
 */

import { ErrorCode } from '../../../src/types/common'
import type { ApiResponse } from '../../../src/types/common'

interface FieldRule {
  name: string
  type: 'string' | 'number' | 'boolean'
  required: boolean
}

export function validateParams<T = null>(
  params: Record<string, unknown>,
  rules: FieldRule[],
): ApiResponse<T> | null {
  for (const rule of rules) {
    const value = params[rule.name]

    if (rule.required && (value === undefined || value === null || value === '')) {
      return {
        code: ErrorCode.BAD_REQUEST,
        message: `${rule.name} field is required`,
        data: null,
      }
    }

    if (value !== undefined && value !== null && typeof value !== rule.type) {
      return {
        code: ErrorCode.BAD_REQUEST,
        message: `${rule.name} field type error, expected ${rule.type}`,
        data: null,
      }
    }
  }

  return null
}
