import type { Repository } from '../interfaces/repository'
import type { ApiResponse } from '../../../src/types/common'
import { authenticate } from '../common/auth'
import { ErrorCode } from '../../../src/types/common'
import { fail } from '../common/response'
import { validateParams } from '../common/validate'
import {
  handleCreateTask,
  handleListTasks,
  handleListTaskSubmissions,
  handleSubmitTask,
  handleTaskDetail,
  handleTaskFeedback,
} from './taskService'

interface TaskEvent {
  action?: string
  taskId?: string
  submissionId?: string
  groupId?: string
  bookId?: string
  title?: string
  description?: string
  dueAt?: number
  text?: string
  imageFileId?: string
  question?: string
  comment?: string
  score?: number
  confirmed?: boolean
  [key: string]: unknown
}

export async function taskMain(
  event: TaskEvent,
  context: { OPENID?: string },
  repo: Repository,
): Promise<ApiResponse<unknown>> {
  const actionError = validateParams(event, [{ name: 'action', type: 'string', required: true }])
  if (actionError) return actionError
  const openid = context.OPENID ?? ''
  const authResult = await authenticate(repo, openid)
  if (authResult.error) return authResult.error

  switch (event.action) {
    case 'create':
      return handleCreateTask(repo, authResult.auth!, {
        groupId: event.groupId ?? '',
        bookId: event.bookId,
        title: event.title ?? '',
        description: event.description ?? '',
        dueAt: event.dueAt,
      })
    case 'list':
      return handleListTasks(repo, openid)
    case 'detail':
      return handleTaskDetail(repo, openid, event.taskId ?? '')
    case 'submit':
      return handleSubmitTask(repo, openid, {
        taskId: event.taskId ?? '',
        text: event.text,
        imageFileId: event.imageFileId,
        question: event.question,
      })
    case 'submissions':
      return handleListTaskSubmissions(repo, authResult.auth!, event.taskId ?? '')
    case 'feedback':
      return handleTaskFeedback(repo, authResult.auth!, {
        submissionId: event.submissionId ?? '',
        comment: event.comment ?? '',
        score: event.score,
        confirmed: event.confirmed ?? false,
      })
    default:
      return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${event.action}`)
  }
}

export { main } from './main'
