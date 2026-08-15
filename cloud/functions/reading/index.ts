import type { Repository } from '../interfaces/repository'
import type { ApiResponse } from '../../../src/types/common'
import type { ReadingEventType } from '../../../src/types/reading'
import { authenticate } from '../common/auth'
import { ErrorCode } from '../../../src/types/common'
import { fail } from '../common/response'
import { validateParams } from '../common/validate'
import {
  handleCompleteReadingPlan,
  handleCreateReadingPlan,
  handleListReadingEvents,
  handleListReadingPlans,
  handleReadingStat,
  handleRecordParticipation,
} from './readingService'

interface ReadingEventInput {
  action?: string
  planId?: string
  bookId?: string
  targetDate?: string
  eventType?: ReadingEventType
  groupId?: string
  classId?: string
  [key: string]: unknown
}

export async function readingMain(
  event: ReadingEventInput,
  context: { OPENID?: string },
  repo: Repository,
): Promise<ApiResponse<unknown>> {
  const actionError = validateParams(event, [{ name: 'action', type: 'string', required: true }])
  if (actionError) return actionError
  const openid = context.OPENID ?? ''
  const authResult = await authenticate(repo, openid)
  if (authResult.error) return authResult.error

  switch (event.action) {
    case 'createPlan':
      return handleCreateReadingPlan(repo, openid, { bookId: event.bookId ?? '', targetDate: event.targetDate })
    case 'listPlans':
      return handleListReadingPlans(repo, openid)
    case 'completePlan':
      return handleCompleteReadingPlan(repo, openid, event.planId ?? '')
    case 'recordParticipation':
      return handleRecordParticipation(repo, openid, {
        bookId: event.bookId ?? '',
        eventType: event.eventType ?? 'discussion',
        groupId: event.groupId,
        classId: event.classId,
      })
    case 'listEvents':
      return handleListReadingEvents(repo, openid, event.bookId)
    case 'stat':
      return handleReadingStat(repo, openid)
    default:
      return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${event.action}`)
  }
}
