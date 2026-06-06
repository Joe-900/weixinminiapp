/**
 * @file 用户域纯业务函数
 * @description 通过注入的 Repository 操作数据，不直接调用云 SDK
 * 业务函数与云入口分离，支持依赖注入，便于本地 Mock 测试
 */

import type { Repository } from '../interfaces/repository'
import type { ApiResponse } from '../../src/types/common'
import type { LoginResult, ProfileParams, User } from '../../src/types/user'
import { success, fail } from '../common/response'
import { ErrorCode } from '../../src/types/common'
import { validateParams } from '../common/validate'

/**
 * 用户登录：根据 openid 查找用户，不存在则创建
 */
export async function handleLogin(
  repo: Repository,
  openid: string,
): Promise<ApiResponse<LoginResult>> {
  if (!openid) {
    return fail(ErrorCode.UNAUTHORIZED, '无法获取 openid')
  }

  let user = await repo.findUserByOpenid(openid)

  if (!user) {
    user = await repo.createUser({
      openid,
      nickname: '',
      avatar: '',
      role: 'user',
      createdAt: Date.now(),
    })
  }

  return success({
    openid: user.openid,
    role: user.role,
  })
}

/**
 * 更新用户资料
 */
export async function handleProfile(
  repo: Repository,
  openid: string,
  params: ProfileParams,
): Promise<ApiResponse<User>> {
  const validationError = validateParams(params, [
    { name: 'nickname', type: 'string', required: true },
    { name: 'avatar', type: 'string', required: true },
  ])
  if (validationError) return validationError

  const user = await repo.findUserByOpenid(openid)
  if (!user) {
    return fail(ErrorCode.UNAUTHORIZED, '用户不存在')
  }

  const updated = await repo.updateUser(openid, {
    nickname: params.nickname,
    avatar: params.avatar,
  })

  return success(updated)
}
