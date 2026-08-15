import { callFunction } from './request'
import type { ApiResponse } from '../types/common'
import type { ClassGroup, CommunityGroupParams, CommunityMember } from '../types/community'

export function createCommunityGroup(params: CommunityGroupParams): Promise<ApiResponse<ClassGroup>> {
  return callFunction({ name: 'community', data: { action: 'create', ...params } })
}

export function joinCommunityGroup(inviteCode: string): Promise<ApiResponse<CommunityMember>> {
  return callFunction({ name: 'community', data: { action: 'join', inviteCode } })
}

export function listCommunityGroups(): Promise<ApiResponse<ClassGroup[]>> {
  return callFunction({ name: 'community', data: { action: 'list' } })
}

export function listCommunityMembers(groupId: string): Promise<ApiResponse<CommunityMember[]>> {
  return callFunction({ name: 'community', data: { action: 'members', groupId } })
}
