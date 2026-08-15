import { callFunction } from './request'
import type { ApiResponse } from '../types/common'
import type { RankingResult } from '../types/reading'

export function getRanking(groupId?: string): Promise<ApiResponse<RankingResult>> {
  return callFunction({ name: 'ranking', data: { action: 'list', groupId } })
}
