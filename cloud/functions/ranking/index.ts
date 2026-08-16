import type { Repository } from '../interfaces/repository'
import type { ApiResponse } from '../../../src/types/common'
import { authenticate } from '../common/auth'
import { ErrorCode } from '../../../src/types/common'
import { fail } from '../common/response'
import { validateParams } from '../common/validate'
import { handleRanking } from './rankingService'

interface RankingEvent {
  action?: string
  groupId?: string
  [key: string]: unknown
}

export async function rankingMain(
  event: RankingEvent,
  context: { OPENID?: string },
  repo: Repository,
): Promise<ApiResponse<unknown>> {
  const actionError = validateParams(event, [{ name: 'action', type: 'string', required: true }])
  if (actionError) return actionError
  const openid = context.OPENID ?? ''
  const authResult = await authenticate(repo, openid)
  if (authResult.error) return authResult.error
  if (event.action === 'list') return handleRanking(repo, openid, event.groupId)
  return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${event.action}`)
}

export { main } from './main'
