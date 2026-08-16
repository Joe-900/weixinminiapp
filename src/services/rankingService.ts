import { callFunction } from './request'
import type { ApiResponse } from '../types/common'
import type { RankingResult, ReadingEvent } from '../types/reading'

export function getRanking(groupId?: string): Promise<ApiResponse<RankingResult>> {
  return callFunction({ name: 'ranking', data: { action: 'list', groupId } })
}

/** 作废行为事件（仅管理员或负责教师，必须提供原因） */
export function invalidateEvent(eventId: string, reason: string): Promise<ApiResponse<ReadingEvent>> {
  return callFunction({ name: 'ranking', data: { action: 'invalidate', eventId, reason } })
}
