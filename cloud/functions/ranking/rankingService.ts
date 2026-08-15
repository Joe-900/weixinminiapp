import type { Repository } from '../interfaces/repository'
import type { ApiResponse } from '../../../src/types/common'
import type { RankingResult, ReadingEvent, ReadingEventType } from '../../../src/types/reading'
import { ErrorCode } from '../../../src/types/common'
import { fail, success } from '../common/response'

const EVENT_SCORE: Record<ReadingEventType, number> = {
  checkin: 1,
  plan_started: 0,
  plan_completed: 5,
  task_submitted: 2,
  teacher_confirmed: 10,
  group_activity: 2,
  discussion: 1,
}

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
