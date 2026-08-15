export type CommunityGroupType = 'class' | 'reading_group'
export type CommunityMemberRole = 'owner' | 'teacher' | 'member'

export interface ClassGroup {
  _id: string
  groupId: string
  name: string
  type: CommunityGroupType
  ownerOpenid: string
  inviteCode: string
  createdAt: number
  archivedAt?: number
}

export interface CommunityMember {
  _id: string
  memberId: string
  groupId: string
  openid: string
  role: CommunityMemberRole
  joinedAt: number
}

export interface CommunityGroupParams {
  name: string
  type: CommunityGroupType
}

export interface CommunityJoinParams {
  inviteCode: string
}
