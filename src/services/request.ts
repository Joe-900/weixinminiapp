/**
 * @file 统一请求封装
 * @description 处理 loading、错误码到提示的映射、重试
 * 前端调用云函数的唯一出口
 */

import Taro from '@tarojs/taro'
import type { ApiResponse } from '../types/common'
import { ErrorCode, ERROR_MESSAGE_MAP } from '../types/common'
import { CURRENT_MODE } from '../types/config'
import { callMockFunction } from './mockBridge'

interface CallFunctionParams {
  name: string
  data: Record<string, unknown>
}

/**
 * 统一云函数调用入口
 * local 模式走 mockBridge，cloud 模式走真实云函数
 */
export async function callFunction<T = unknown>(
  params: CallFunctionParams,
): Promise<ApiResponse<T>> {
  if (CURRENT_MODE === 'local') {
    return callMockFunction<T>(params.name, params.data)
  }

  try {
    const result = await Taro.cloud.callFunction({
      name: params.name,
      data: params.data,
    })

    const response = result.result as ApiResponse<T>
    return response
  } catch (error) {
    const msg = error instanceof Error ? error.message : '未知错误'
    return {
      code: ErrorCode.INTERNAL_ERROR,
      message: msg,
      data: null,
    }
  }
}

/**
 * 根据错误码展示提示
 */
export function showErrorToast(code: number): void {
  const message = ERROR_MESSAGE_MAP[code] ?? '未知错误'
  Taro.showToast({ title: message, icon: 'none', duration: 2000 })
}

/**
 * 判断是否成功
 */
export function isSuccess(response: ApiResponse<unknown>): boolean {
  return response.code === ErrorCode.SUCCESS
}
