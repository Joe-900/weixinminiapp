import type { Repository } from '../interfaces/repository'
import type { AuthContext } from '../common/auth'
import type { ApiResponse } from '../../../src/types/common'
import type {
  ClassGroup,
  CommunityGroupParams,
  CommunityMember,
} from '../../../src/types/community'
import { ErrorCode } from '../../../src/types/common'
import { fail, success } from '../common/response'
import { validateParams } from '../common/validate'

function createInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export async function handleCreateCommunityGroup(
  repo: Repository,
  auth: AuthContext,
  params: CommunityGroupParams,
): Promise<ApiResponse<ClassGroup>> {
  const validationError = validateParams<ClassGroup>(params as unknown as Record<string, unknown>, [
    { name: 'name', type: 'string', required: true },
    { name: 'type', type: 'string', required: true },
  ])
  if (validationError) return validationError
  if (params.type !== 'class' && params.type !== 'reading_group') {
    return fail(ErrorCode.BAD_REQUEST, 'Invalid group type')
  }
  if (params.type === 'class' && auth.role !== 'teacher' && auth.role !== 'admin') {
    return fail(ErrorCode.FORBIDDEN, 'Only teachers can create a class')
  }

  const group = await repo.createCommunityGroup({
    name: params.name.trim(),
    type: params.type,
    ownerOpenid: auth.openid,
    inviteCode: createInviteCode(),
    createdAt: Date.now(),
  })
  await repo.addCommunityMember({
    groupId: group.groupId,
    openid: auth.openid,
    role: params.type === 'class' ? 'teacher' : 'owner',
    joinedAt: Date.now(),
  })
  return success(group)
}

export async function handleJoinCommunityGroup(
  repo: Repository,
  openid: string,
  inviteCode: string,
): Promise<ApiResponse<CommunityMember>> {
  if (!inviteCode) return fail(ErrorCode.BAD_REQUEST, 'inviteCode is required')
  const group = await repo.findCommunityGroupByInviteCode(inviteCode.trim().toUpperCase())
  if (!group || group.archivedAt) return fail(ErrorCode.NOT_FOUND, 'Group not found')

  const existing = await repo.findCommunityMember(group.groupId, openid)
  if (existing) return success(existing)
  return success(await repo.addCommunityMember({
    groupId: group.groupId,
    openid,
    role: 'member',
    joinedAt: Date.now(),
  }))
}

export async function handleListCommunityGroups(
  repo: Repository,
  openid: string,
): Promise<ApiResponse<ClassGroup[]>> {
  return success(await repo.listCommunityGroups(openid))
}

export async function handleListCommunityMembers(
  repo: Repository,
  openid: string,
  groupId: string,
): Promise<ApiResponse<CommunityMember[]>> {
  if (!groupId) return fail(ErrorCode.BAD_REQUEST, 'groupId is required')
  const group = await repo.findCommunityGroup(groupId)
  if (!group) return fail(ErrorCode.NOT_FOUND, 'Group not found')
  const membership = await repo.findCommunityMember(groupId, openid)
  if (!membership && group.ownerOpenid !== openid) {
    return fail(ErrorCode.ACCESS_DENIED, 'Not a member of this group')
  }
  return success(await repo.listCommunityMembers(groupId))
}
