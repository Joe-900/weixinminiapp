/**
 * @file 鉴权工具
 * @description 取上下文 openid、查 role，提供鉴权能力
 */

import type { Repository } from '../interfaces/repository'
import { ErrorCode } from '../../src/types/common'
import type { ApiResponse } from '../../src/types/common'
import type { User } from '../../src/types/user'

export interface AuthContext {
  openid: string
  role: string
  user: User | null
}

/**
 * 从云函数上下文获取 openid
 * 需按官方最新文档核实：微信云开发获取 OPENID 的方式
 */
export function getOpenidFromContext(context: Record<string, unknown>): string {
  const openid = (context as { OPENID?: string }).OPENID ?? ''
  return openid
}

/**
 * 鉴权：获取用户身份信息
 */
export async function authenticate(
  repo: Repository,
  openid: string,
): Promise<{ auth: AuthContext | null; error: ApiResponse<null> | null }> {
  if (!openid) {
    return {
      auth: null,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: '无法获取 openid',
        data: null,
      },
    }
  }

  const user = await repo.findUserByOpenid(openid)

  if (!user) {
    return {
      auth: null,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: '用户不存在',
        data: null,
      },
    }
  }

  return {
    auth: {
      openid: user.openid,
      role: user.role,
      user,
    },
    error: null,
  }
}

/**
 * 校验是否为管理员
 */
export function requireAdmin(auth: AuthContext): ApiResponse<null> | null {
  if (auth.role !== 'admin') {
    return {
      code: ErrorCode.FORBIDDEN,
      message: '权限不足，仅管理员可执行此操作',
      data: null,
    }
  }
  return null
}

/**
 * 校验数据归属：当前用户只能操作自己的数据
 */
export function requireOwner(auth: AuthContext, dataOpenid: string): ApiResponse<null> | null {
  if (auth.openid !== dataOpenid) {
    return {
      code: ErrorCode.ACCESS_DENIED,
      message: '越权访问，只能操作本人数据',
      data: null,
    }
  }
  return null
}
