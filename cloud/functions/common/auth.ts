/**
 * @file Auth utility
 * @description Get context openid, check role, provide auth capabilities
 */

import type { Repository } from '../interfaces/repository'
import { ErrorCode } from '../../../src/types/common'
import type { ApiResponse } from '../../../src/types/common'
import type { User } from '../../../src/types/user'

export interface AuthContext {
  openid: string
  role: string
  user: User | null
}

/**
 * Get openid from cloud function context
 * Need to verify with latest official docs: WeChat cloud development OPENID retrieval
 */
export function getOpenidFromContext(context: Record<string, unknown>): string {
  const openid = (context as { OPENID?: string }).OPENID ?? ''
  return openid
}

/**
 * Authenticate: get user identity info
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
        message: 'Cannot get openid',
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
        message: 'User not found',
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
 * Check if user is admin
 */
export function requireAdmin(auth: AuthContext): ApiResponse<null> | null {
  if (auth.role !== 'admin') {
    return {
      code: ErrorCode.FORBIDDEN,
      message: 'Permission denied, admin only',
      data: null,
    }
  }
  return null
}

/**
 * Check data ownership: current user can only operate own data
 */
export function requireOwner(auth: AuthContext, dataOpenid: string): ApiResponse<null> | null {
  if (auth.openid !== dataOpenid) {
    return {
      code: ErrorCode.ACCESS_DENIED,
      message: 'Access denied, can only operate own data',
      data: null,
    }
  }
  return null
}
