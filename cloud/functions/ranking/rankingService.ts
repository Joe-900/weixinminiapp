import type { Repository } from '../interfaces/repository'
import type { ApiResponse } from '../../../src/types/common'
import type { InvalidateEventParams, RankingResult, ReadingEvent, ReadingEventType } from '../../../src/types/reading'
import type { AuthContext } from '../common/auth'
import { ErrorCode } from '../../../src/types/common'
import { fail, success } from '../common/response'
import { requireAdmin } from '../common/auth'
import { validateParams } from '../common/validate'

const EVENT_SCORE: Record<ReadingEventType, number> = {
  checkin: 1,
  plan_started: 0,
  plan_completed: 5,
  task_submitted: 2,
  teacher_confirmed: 10,
  group_activity: 2,
  discussion: 1,
}

const MAX_INVALIDATE_REASON_LENGTH = 200

function isServerVerified(event: ReadingEvent): boolean {
  if (event.eventType === 'discussion' || event.eventType === 'group_activity') {
    return event.source === 'user' || event.source === 'teacher' || event.source === 'system'
  }
  if (event.eventType === 'teacher_confirmed') return event.source === 'teacher'
  return event.source === 'system'
}

function scoreEvents(events: ReadingEvent[]): { score: number; validEventCount: number } {
  const seenCheckinDays = new Set<string>()
  let score = 0
  let validEventCount = 0

  for (const event of events) {
    if (event.invalidated) continue
    if (!isServerVerified(event)) continue
    if (event.eventType === 'checkin') {
      const day = new Date(event.createdAt).toISOString().slice(0, 10)
      const key = `${event.openid}:${event.bookId}:${day}`
      if (seenCheckinDays.has(key)) continue
      seenCheckinDays.add(key)
    }
    const baseScore = EVENT_SCORE[event.eventType]
    const teacherScore = event.eventType === 'teacher_confirmed' && event.points !== undefined
      ? Math.max(0, Math.min(100, event.points)) / 10
      : 0
    score += baseScore + teacherScore
    validEventCount += 1
  }
  return { score: Math.round(score * 10) / 10, validEventCount }
}

export async function handleRanking(
  repo: Repository,
  openid: string,
  groupId?: string,
): Promise<ApiResponse<RankingResult>> {
  let memberOpenids: Set<string> | null = null
  if (groupId) {
    const group = await repo.findCommunityGroup(groupId)
    if (!group) return fail(ErrorCode.NOT_FOUND, 'Group not found')
    const currentMember = await repo.findCommunityMember(groupId, openid)
    if (!currentMember && group.ownerOpenid !== openid) {
      return fail(ErrorCode.ACCESS_DENIED, 'Not a member of this group')
    }
    memberOpenids = new Set((await repo.listCommunityMembers(groupId)).map((member) => member.openid))
  }

  const events = await repo.listAllReadingEvents(groupId)
  const users = await repo.listUsers()
  const userMap = new Map(users.map((user) => [user.openid, user]))
  const eventGroups = new Map<string, ReadingEvent[]>()
  for (const event of events) {
    if (event.invalidated) continue
    if (memberOpenids && !memberOpenids.has(event.openid)) continue
    const current = eventGroups.get(event.openid) ?? []
    current.push(event)
    eventGroups.set(event.openid, current)
  }

  const entries = Array.from(eventGroups.entries())
    .map(([entryOpenid, userEvents]) => {
      const scored = scoreEvents(userEvents)
      return {
        rank: 0,
        openid: entryOpenid,
        nickname: userMap.get(entryOpenid)?.nickname || 'Reader',
        ...scored,
      }
    })
    .filter((entry) => entry.validEventCount > 0)
    .sort((a, b) => b.score - a.score || b.validEventCount - a.validEventCount || a.openid.localeCompare(b.openid))
    .map((entry, index) => ({ ...entry, rank: index + 1 }))

  return success({
    scope: groupId ? 'group' : 'global',
    groupId,
    generatedAt: Date.now(),
    entries,
  })
}

/**
 * 作废行为事件（仅管理员或负责教师可操作，必须记录原因）。
 * 作废事件不参与排行榜计算（查询时实时过滤），作废记录保留在事件上可追溯。
 */
export async function handleInvalidateEvent(
  repo: Repository,
  auth: AuthContext,
  params: InvalidateEventParams,
): Promise<ApiResponse<ReadingEvent>> {
  const validationError = validateParams<ReadingEvent>(
    params as unknown as Record<string, unknown>,
    [
      { name: 'eventId', type: 'string', required: true },
      { name: 'reason', type: 'string', required: true },
    ],
  )
  if (validationError) return validationError
  const reason = params.reason.trim()
  if (!reason) return fail(ErrorCode.BAD_REQUEST, 'reason is required')
  if (reason.length > MAX_INVALIDATE_REASON_LENGTH) {
    return fail(ErrorCode.BAD_REQUEST, `reason must be at most ${MAX_INVALIDATE_REASON_LENGTH} characters`)
  }

  const event = await repo.findReadingEvent(params.eventId)
  if (!event) return fail(ErrorCode.NOT_FOUND, 'Event not found')

  // 权限：管理员可直接作废；负责教师仅可作废自己负责班级/小组内的事件
  const adminError = requireAdmin<ReadingEvent>(auth)
  if (adminError && !(await isResponsibleTeacher(repo, auth, event))) {
    return fail(ErrorCode.FORBIDDEN, 'Only admin or the responsible teacher can invalidate events')
  }

  if (event.invalidated) {
    // 幂等：已作废则原样返回（保留首次作废记录）
    return success(event)
  }

  const updated = await repo.invalidateReadingEvent(event.eventId, auth.openid, reason)
  if (!updated) return fail(ErrorCode.NOT_FOUND, 'Event not found')
  return success(updated)
}

/**
 * 负责教师判定：事件的 classId/groupId 指向的班级或小组的创建者，
 * 或该小组内 role 为 teacher 的成员。个人事件（无 classId/groupId）教师无权作废。
 */
async function isResponsibleTeacher(repo: Repository, auth: AuthContext, event: ReadingEvent): Promise<boolean> {
  if (auth.role !== 'teacher') return false
  const communityId = event.groupId ?? event.classId
  if (!communityId) return false
  const group = await repo.findCommunityGroup(communityId)
  if (!group) return false
  if (group.ownerOpenid === auth.openid) return true
  const member = await repo.findCommunityMember(communityId, auth.openid)
  return member?.role === 'teacher'
}
