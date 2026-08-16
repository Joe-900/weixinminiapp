import type { Repository } from '../interfaces/repository'
import type { CommunityGroupType } from '../../../src/types/community'
import type { ApiResponse } from '../../../src/types/common'
import { authenticate } from '../common/auth'
import { ErrorCode } from '../../../src/types/common'
import { fail } from '../common/response'
import { validateParams } from '../common/validate'
import {
  handleCreateCommunityGroup,
  handleJoinCommunityGroup,
  handleListCommunityGroups,
  handleListCommunityMembers,
} from './communityService'

interface CommunityEvent {
  action?: string
  name?: string
  type?: CommunityGroupType
  inviteCode?: string
  groupId?: string
  [key: string]: unknown
}

export async function communityMain(
  event: CommunityEvent,
  context: { OPENID?: string },
  repo: Repository,
): Promise<ApiResponse<unknown>> {
  const actionError = validateParams(event, [{ name: 'action', type: 'string', required: true }])
  if (actionError) return actionError
  const openid = context.OPENID ?? ''
  const authResult = await authenticate(repo, openid)
  if (authResult.error) return authResult.error

  switch (event.action) {
    case 'create':
      return handleCreateCommunityGroup(repo, authResult.auth!, {
        name: event.name ?? '',
        type: event.type ?? 'reading_group',
      })
    case 'join':
      return handleJoinCommunityGroup(repo, openid, event.inviteCode ?? '')
    case 'list':
      return handleListCommunityGroups(repo, openid)
    case 'members':
      return handleListCommunityMembers(repo, openid, event.groupId ?? '')
    default:
      return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${event.action}`)
  }
}

export { main } from './main'
