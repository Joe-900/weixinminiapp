import { callFunction } from './request'
import type { ApiResponse } from '../types/common'
import type {
  ReadingEvent,
  ReadingEventParams,
  ReadingPlan,
  ReadingPlanCreateParams,
  ReadingStat,
} from '../types/reading'

export function createReadingPlan(params: ReadingPlanCreateParams): Promise<ApiResponse<ReadingPlan>> {
  return callFunction({ name: 'reading', data: { action: 'createPlan', ...params } })
}

export function listReadingPlans(): Promise<ApiResponse<ReadingPlan[]>> {
  return callFunction({ name: 'reading', data: { action: 'listPlans' } })
}

export function completeReadingPlan(planId: string): Promise<ApiResponse<ReadingPlan>> {
  return callFunction({ name: 'reading', data: { action: 'completePlan', planId } })
}

export function recordReadingParticipation(params: ReadingEventParams): Promise<ApiResponse<ReadingEvent>> {
  return callFunction({ name: 'reading', data: { action: 'recordParticipation', ...params } })
}

export function listReadingEvents(bookId?: string): Promise<ApiResponse<ReadingEvent[]>> {
  return callFunction({ name: 'reading', data: { action: 'listEvents', bookId } })
}

export function getReadingStat(): Promise<ApiResponse<ReadingStat>> {
  return callFunction({ name: 'reading', data: { action: 'stat' } })
}
