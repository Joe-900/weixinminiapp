import type { Repository } from '../interfaces/repository'
import type { AuthContext } from '../common/auth'
import type { ApiResponse } from '../../../src/types/common'
import type {
  ReadingTask,
  TaskCreateParams,
  TaskDetail,
  TaskFeedback,
  TaskFeedbackParams,
  TaskSubmission,
  TaskSubmitParams,
} from '../../../src/types/task'
import { ErrorCode } from '../../../src/types/common'
import { fail, success } from '../common/response'
import { validateParams } from '../common/validate'

async function canManageGroup(repo: Repository, auth: AuthContext, groupId: string): Promise<boolean> {
  const group = await repo.findCommunityGroup(groupId)
  if (!group) return false
  if (auth.role === 'admin' || group.ownerOpenid === auth.openid) return true
  const member = await repo.findCommunityMember(groupId, auth.openid)
  return member?.role === 'teacher' || member?.role === 'owner'
}

export async function handleCreateTask(
  repo: Repository,
  auth: AuthContext,
  params: TaskCreateParams,
): Promise<ApiResponse<ReadingTask>> {
  const validationError = validateParams<ReadingTask>(params as unknown as Record<string, unknown>, [
    { name: 'groupId', type: 'string', required: true },
    { name: 'title', type: 'string', required: true },
    { name: 'description', type: 'string', required: true },
  ])
  if (validationError) return validationError

  const group = await repo.findCommunityGroup(params.groupId)
  if (!group) return fail(ErrorCode.NOT_FOUND, 'Group not found')
  if (!(await canManageGroup(repo, auth, params.groupId))) {
    return fail(ErrorCode.FORBIDDEN, 'Only this group teacher or owner can publish tasks')
  }
  if (params.bookId && !(await repo.findBookById(params.bookId))) {
    return fail(ErrorCode.NOT_FOUND, 'Book not found')
  }
  if (params.dueAt !== undefined && params.dueAt <= Date.now()) {
    return fail(ErrorCode.BAD_REQUEST, 'dueAt must be in the future')
  }

  return success(await repo.createTask({
    groupId: params.groupId,
    teacherOpenid: auth.openid,
    bookId: params.bookId,
    title: params.title.trim(),
    description: params.description.trim(),
    dueAt: params.dueAt,
    createdAt: Date.now(),
    status: 'published',
  }))
}

export async function handleListTasks(
  repo: Repository,
  openid: string,
): Promise<ApiResponse<ReadingTask[]>> {
  const groupIds = (await repo.listCommunityGroups(openid)).map((group) => group.groupId)
  return success(await repo.listTasksForUser(openid, groupIds))
}

export async function handleSubmitTask(
  repo: Repository,
  openid: string,
  params: TaskSubmitParams,
): Promise<ApiResponse<TaskSubmission>> {
  if (!params.taskId) return fail(ErrorCode.BAD_REQUEST, 'taskId is required')
  if (!params.text?.trim() && !params.question?.trim() && !params.imageFileId) {
    return fail(ErrorCode.BAD_REQUEST, 'At least one submission field is required')
  }
  const task = await repo.findTask(params.taskId)
  if (!task || task.status !== 'published') return fail(ErrorCode.NOT_FOUND, 'Task not found')
  if (task.dueAt && task.dueAt < Date.now()) return fail(ErrorCode.BAD_REQUEST, 'Task is overdue')
  if (!(await repo.findCommunityMember(task.groupId, openid))) {
    return fail(ErrorCode.ACCESS_DENIED, 'Not a member of this task group')
  }

  const now = Date.now()
  const existing = await repo.findTaskSubmission(task.taskId, openid)
  const submission = existing
    ? await repo.updateTaskSubmission(existing.submissionId, {
        text: params.text?.trim(),
        question: params.question?.trim(),
        imageFileId: params.imageFileId,
        status: 'submitted',
      })
    : await repo.createTaskSubmission({
        taskId: task.taskId,
        openid,
        text: params.text?.trim(),
        question: params.question?.trim(),
        imageFileId: params.imageFileId,
        status: 'submitted',
        createdAt: now,
        updatedAt: now,
      })

  if (!existing && task.bookId) {
    await repo.addReadingEvent({
      openid,
      bookId: task.bookId,
      eventType: 'task_submitted',
      source: 'system',
      taskId: task.taskId,
      groupId: task.groupId,
      classId: task.groupId,
      createdAt: now,
    })
  }
  return success(submission)
}

export async function handleTaskDetail(
  repo: Repository,
  openid: string,
  taskId: string,
): Promise<ApiResponse<TaskDetail>> {
  if (!taskId) return fail(ErrorCode.BAD_REQUEST, 'taskId is required')
  const task = await repo.findTask(taskId)
  if (!task) return fail(ErrorCode.NOT_FOUND, 'Task not found')
  if (!(await repo.findCommunityMember(task.groupId, openid))) {
    return fail(ErrorCode.ACCESS_DENIED, 'Not a member of this task group')
  }
  const submission = await repo.findTaskSubmission(taskId, openid)
  const feedback = submission ? await repo.listTaskFeedback(submission.submissionId) : []
  return success({ task, submission, feedback })
}

export async function handleListTaskSubmissions(
  repo: Repository,
  auth: AuthContext,
  taskId: string,
): Promise<ApiResponse<TaskSubmission[]>> {
  if (!taskId) return fail(ErrorCode.BAD_REQUEST, 'taskId is required')
  const task = await repo.findTask(taskId)
  if (!task) return fail(ErrorCode.NOT_FOUND, 'Task not found')
  if (!(await canManageGroup(repo, auth, task.groupId))) return fail(ErrorCode.FORBIDDEN, 'No task review permission')
  return success(await repo.listTaskSubmissions(taskId))
}

export async function handleTaskFeedback(
  repo: Repository,
  auth: AuthContext,
  params: TaskFeedbackParams,
): Promise<ApiResponse<TaskFeedback>> {
  const validationError = validateParams<TaskFeedback>(params as unknown as Record<string, unknown>, [
    { name: 'submissionId', type: 'string', required: true },
    { name: 'comment', type: 'string', required: true },
    { name: 'confirmed', type: 'boolean', required: true },
  ])
  if (validationError) return validationError
  if (params.score !== undefined && (params.score < 0 || params.score > 100)) {
    return fail(ErrorCode.BAD_REQUEST, 'score must be between 0 and 100')
  }

  const submission = await repo.findTaskSubmissionById(params.submissionId)
  if (!submission) return fail(ErrorCode.NOT_FOUND, 'Submission not found')
  const task = await repo.findTask(submission.taskId)
  if (!task) return fail(ErrorCode.NOT_FOUND, 'Task not found')
  if (!(await canManageGroup(repo, auth, task.groupId))) return fail(ErrorCode.FORBIDDEN, 'No task review permission')

  const existingFeedback = await repo.listTaskFeedback(submission.submissionId)
  const feedback = await repo.addTaskFeedback({
    submissionId: submission.submissionId,
    teacherOpenid: auth.openid,
    comment: params.comment.trim(),
    score: params.score,
    confirmed: params.confirmed,
    createdAt: Date.now(),
  })
  await repo.updateTaskSubmission(submission.submissionId, {
    status: params.confirmed ? 'reviewed' : 'returned',
  })

  if (params.confirmed && task.bookId && !existingFeedback.some((item) => item.confirmed)) {
    await repo.addReadingEvent({
      openid: submission.openid,
      bookId: task.bookId,
      eventType: 'teacher_confirmed',
      source: 'teacher',
      points: params.score,
      taskId: task.taskId,
      groupId: task.groupId,
      classId: task.groupId,
      createdAt: Date.now(),
    })
  }
  return success(feedback)
}
