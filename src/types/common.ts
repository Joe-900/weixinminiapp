/**
 * @file 统一返回信封与错误码类型定义
 * @description 前后端共享的 API 返回结构与错误码枚举
 */

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T | null
}

export enum ErrorCode {
  SUCCESS = 0,
  UNAUTHORIZED = 1001,
  FORBIDDEN = 1002,
  BAD_REQUEST = 1003,
  NOT_FOUND = 1004,
  ACCESS_DENIED = 1005,
  AI_ERROR = 2001,
  AI_LIMIT = 2002,
  AI_CONFIG_MISSING = 2003,
  AI_TIMEOUT = 2004,
  AI_QUOTA_EXCEEDED = 2005,
  AI_INVALID_RESPONSE = 2006,
  STORAGE_ERROR = 2007,
  INTERNAL_ERROR = 5000,
}

export const ERROR_MESSAGE_MAP: Record<number, string> = {
  [ErrorCode.SUCCESS]: '成功',
  [ErrorCode.UNAUTHORIZED]: '未登录或身份无效',
  [ErrorCode.FORBIDDEN]: '权限不足',
  [ErrorCode.BAD_REQUEST]: '入参缺失或非法',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.ACCESS_DENIED]: '越权访问',
  [ErrorCode.AI_ERROR]: '大模型调用失败',
  [ErrorCode.AI_LIMIT]: '触发用量限制',
  [ErrorCode.AI_CONFIG_MISSING]: 'AI 服务未配置',
  [ErrorCode.AI_TIMEOUT]: 'AI 请求超时',
  [ErrorCode.AI_QUOTA_EXCEEDED]: 'AI 额度不足',
  [ErrorCode.AI_INVALID_RESPONSE]: 'AI 返回异常',
  [ErrorCode.STORAGE_ERROR]: '图片存储处理失败',
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
}

export interface PaginatedData<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}
