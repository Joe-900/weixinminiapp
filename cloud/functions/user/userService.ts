/**
 * @file User domain pure business functions
 * @description Operate data through injected Repository, no direct cloud SDK calls
 * Business functions separated from cloud entry, support DI for local mock testing
 */

import type { Repository } from '../interfaces/repository'
import type { ApiResponse } from '../../../src/types/common'
import type { LoginResult, ProfileParams, User } from '../../../src/types/user'
import { success, fail } from '../common/response'
import { ErrorCode } from '../../../src/types/common'
import { validateParams } from '../common/validate'

/**
 * User login: find user by openid, create if not exists
 */
export async function handleLogin(
  repo: Repository,
  openid: string,
): Promise<ApiResponse<LoginResult>> {
  if (!openid) {
    return fail(ErrorCode.UNAUTHORIZED, 'Cannot get openid')
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
 * Update user profile
 */
export async function handleProfile(
  repo: Repository,
  openid: string,
  params: ProfileParams,
): Promise<ApiResponse<User>> {
  const validationError = validateParams<User>(
    params as unknown as Record<string, unknown>,
    [
      { name: 'nickname', type: 'string', required: true },
      { name: 'avatar', type: 'string', required: true },
    ],
  )
  if (validationError) return validationError

  const user = await repo.findUserByOpenid(openid)
  if (!user) {
    return fail(ErrorCode.UNAUTHORIZED, 'User not found')
  }

  const updated = await repo.updateUser(openid, {
    nickname: params.nickname,
    avatar: params.avatar,
  })

  return success(updated)
}
