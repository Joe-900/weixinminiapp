/**
 * @file Error code constants and error creation functions
 * @description Unified error code definitions, consistent with types/common.ts
 */

import { ErrorCode } from '../../../src/types/common'
import type { ApiResponse } from '../../../src/types/common'

export { ErrorCode } from '../../../src/types/common'

export function createError<T = null>(code: ErrorCode, customMessage?: string): ApiResponse<T> {
  const ERROR_MESSAGES: Record<number, string> = {
    [ErrorCode.SUCCESS]: 'Success',
    [ErrorCode.UNAUTHORIZED]: 'Unauthorized or invalid identity',
    [ErrorCode.FORBIDDEN]: 'Permission denied',
    [ErrorCode.BAD_REQUEST]: 'Missing or invalid params',
    [ErrorCode.NOT_FOUND]: 'Resource not found',
    [ErrorCode.ACCESS_DENIED]: 'Access denied',
    [ErrorCode.AI_ERROR]: 'AI service error',
    [ErrorCode.AI_LIMIT]: 'Usage limit reached',
    [ErrorCode.AI_CONFIG_MISSING]: 'AI service is not configured',
    [ErrorCode.AI_TIMEOUT]: 'AI request timed out',
    [ErrorCode.AI_QUOTA_EXCEEDED]: 'AI quota exceeded',
    [ErrorCode.AI_INVALID_RESPONSE]: 'AI returned an invalid response',
    [ErrorCode.STORAGE_ERROR]: 'Image storage processing failed',
    [ErrorCode.INTERNAL_ERROR]: 'Internal server error',
  }

  return {
    code,
    message: customMessage ?? ERROR_MESSAGES[code] ?? 'Unknown error',
    data: null,
  }
}
