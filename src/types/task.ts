export interface ReadingTask {
  _id: string
  taskId: string
  groupId: string
  teacherOpenid: string
  bookId?: string
  title: string
  description: string
  dueAt?: number
  createdAt: number
  status: 'published' | 'closed'
}

export interface TaskSubmission {
  _id: string
  submissionId: string
  taskId: string
  openid: string
  text?: string
  imageFileId?: string
  question?: string
  status: 'submitted' | 'reviewed' | 'returned'
  createdAt: number
  updatedAt: number
}

export interface TaskFeedback {
  _id: string
  feedbackId: string
  submissionId: string
  teacherOpenid: string
  comment: string
  score?: number
  confirmed: boolean
  createdAt: number
}

export interface TaskCreateParams {
  groupId: string
  bookId?: string
  title: string
  description: string
  dueAt?: number
}

export interface TaskSubmitParams {
  taskId: string
  text?: string
  imageFileId?: string
  question?: string
}

export interface TaskFeedbackParams {
  submissionId: string
  comment: string
  score?: number
  confirmed: boolean
}

export interface TaskDetail {
  task: ReadingTask
  submission: TaskSubmission | null
  feedback: TaskFeedback[]
}
