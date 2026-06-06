/**
 * @file 用户域云函数入口
 * @description 鉴权后分发 action 到对应业务函数
 * 云函数入口只负责：取上下文 openid、获取数据库实例，然后传给纯业务函数
 */

import type { ApiResponse } from '../../src/types/common'
import type { Repository } from '../interfaces/repository'
import { handleLogin, handleProfile } from './userService'
import { authenticate } from '../common/auth'
import { fail } from '../common/response'
import { ErrorCode } from '../../src/types/common'
import { validateParams } from '../common/validate'

interface UserEvent {
  action: string
  nickname?: string
  avatar?: string
}

interface CloudContext {
  OPENID?: string
}

/**
 * 用户域云函数入口
 * @param event 请求参数
 * @param context 云函数上下文（包含 OPENID）
 * @param repo 数据访问 Repository 实例
 */
export async function userMain(
  event: UserEvent,
  context: CloudContext,
  repo: Repository,
): Promise<ApiResponse<unknown>> {
  const openid = context.OPENID ?? ''

  const actionValidation = validateParams(event, [
    { name: 'action', type: 'string', required: true },
  ])
  if (actionValidation) return actionValidation

  switch (event.action) {
    case 'login': {
      return handleLogin(repo, openid)
    }

    case 'profile': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error

      return handleProfile(repo, openid, {
        nickname: event.nickname ?? '',
        avatar: event.avatar ?? '',
      })
    }

    default:
      return fail(ErrorCode.BAD_REQUEST, `未知的 action: ${event.action}`)
  }
}
