import { callFunction } from './request'
import type { ApiResponse } from '../types/common'
import type {
  ReadingTask,
  TaskCreateParams,
  TaskDetail,
  TaskFeedback,
  TaskFeedbackParams,
  TaskSubmission,
  TaskSubmitParams,
} from '../types/task'

export function createTask(params: TaskCreateParams): Promise<ApiResponse<ReadingTask>> {
  return callFunction({ name: 'task', data: { action: 'create', ...params } })
}

export function listTasks(): Promise<ApiResponse<ReadingTask[]>> {
  return callFunction({ name: 'task', data: { action: 'list' } })
}

export function getTaskDetail(taskId: string): Promise<ApiResponse<TaskDetail>> {
  return callFunction({ name: 'task', data: { action: 'detail', taskId } })
}

export function submitTask(params: TaskSubmitParams): Promise<ApiResponse<TaskSubmission>> {
  return callFunction({ name: 'task', data: { action: 'submit', ...params } })
}

export function listTaskSubmissions(taskId: string): Promise<ApiResponse<TaskSubmission[]>> {
  return callFunction({ name: 'task', data: { action: 'submissions', taskId } })
}

export function sendTaskFeedback(params: TaskFeedbackParams): Promise<ApiResponse<TaskFeedback>> {
  return callFunction({ name: 'task', data: { action: 'feedback', ...params } })
}
