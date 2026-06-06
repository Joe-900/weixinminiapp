/**
 * @file 用户域前端服务层
 * @description 前端调用用户域云函数的封装，对应每个 action
 */

import { callFunction } from './request'
import type { ApiResponse, LoginResult } from '../types/common'
import type { User, ProfileParams } from '../types/user'

/**
 * 用户登录
 */
export async function login(): Promise<ApiResponse<LoginResult>> {
  return callFunction<LoginResult>({
    name: 'user',
    data: { action: 'login' },
  })
}

/**
 * 更新用户资料
 */
export async function profile(params: ProfileParams): Promise<ApiResponse<User>> {
  return callFunction<User>({
    name: 'user',
    data: { action: 'profile', ...params },
  })
}
