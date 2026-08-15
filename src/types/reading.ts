export type ReadingEventType =
  | 'checkin'
  | 'plan_started'
  | 'plan_completed'
  | 'task_submitted'
  | 'teacher_confirmed'
  | 'group_activity'
  | 'discussion'

export interface ReadingEvent {
  _id: string
  eventId: string
  openid: string
  bookId: string
  eventType: ReadingEventType
  duration?: number
  points?: number
  source: 'user' | 'teacher' | 'system'
  taskId?: string
  classId?: string
  groupId?: string
  createdAt: number
}

export interface ReadingPlan {
  _id: string
  planId: string
  openid: string
  bookId: string
  targetDate?: string
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  createdAt: number
  updatedAt: number
}

export interface ReadingStat {
  streakDays: number
  totalMinutes: number
  completedPlans: number
  eventCount: number
}

export interface ReadingEventParams {
  bookId: string
  eventType: ReadingEventType
  duration?: number
  source?: ReadingEvent['source']
  taskId?: string
  classId?: string
  groupId?: string
}

export interface ReadingPlanCreateParams {
  bookId: string
  targetDate?: string
}

export interface RankingEntry {
  rank: number
  openid: string
  nickname: string
  score: number
  validEventCount: number
}

export interface RankingResult {
  scope: 'global' | 'group'
  groupId?: string
  generatedAt: number
  entries: RankingEntry[]
}
