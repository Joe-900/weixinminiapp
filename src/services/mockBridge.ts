/** Local, network-free implementation of the cloud-function contract. */

import type { ApiResponse, PaginatedData } from '../types/common'
import { ErrorCode, ERROR_MESSAGE_MAP } from '../types/common'
import type { Book, BookKeywordField, BookSortField, BookSortOrder } from '../types/book'
import type { AiImageInput, AiProviderConfigUpdate, BookContextInput, OpenAIChatMessage, OpenAIMultimodalChatMessage } from '../types/ai'
import { DEFAULT_IMAGE_QUESTION } from '../types/ai'
import type { User } from '../types/user'
import type { ReadingEvent, ReadingEventType } from '../types/reading'
import type { CommunityGroupType } from '../types/community'
import type { LibraryImportFailure, LibraryMetadata } from '../types/library'
import { MemoryRepository } from '../mock/memoryRepository'
import { LocalStorage } from '../mock/localStorage'
import { MockAiClient } from '../mock/mockAiClient'
import { seedUsers, seedBooks, seedGroups, seedMembers, seedTasks, seedReadingEvents, MOCK_LOGIN_OPENID } from '../mock/seedData'
import { validateBookTags } from '../utils/bookTags'
import {
  applyAiProviderConfigUpdate,
  toAiProviderConfigView,
  validateAiProviderConfigUpdate,
} from '../utils/aiProviderConfig'

const repo = new MemoryRepository()
const storage = new LocalStorage()
const aiClient = new MockAiClient()
const MOCK_CTX = { OPENID: MOCK_LOGIN_OPENID }

function initSeedData(): void {
  repo.seedUsers(seedUsers)
  repo.seedBooks(seedBooks)
  repo.seedGroups(seedGroups)
  repo.seedMembers(seedMembers)
  repo.seedTasks(seedTasks)
  repo.seedReadingEvents(seedReadingEvents)
}
initSeedData()

export function getMockDeps() {
  return { repo, storage, aiClient }
}

export function resetMockData(): void {
  repo.reset()
  initSeedData()
}

function success<T>(data: T, message = 'Success'): ApiResponse<T> {
  return { code: ErrorCode.SUCCESS, message, data }
}

function fail<T = null>(code: ErrorCode, message?: string): ApiResponse<T> {
  return { code, message: message ?? ERROR_MESSAGE_MAP[code] ?? 'Unknown error', data: null }
}

function validateParams(
  params: Record<string, unknown>,
  rules: Array<{ name: string; type: 'string' | 'number' | 'boolean'; required: boolean }>,
): ApiResponse<null> | null {
  for (const rule of rules) {
    const value = params[rule.name]
    if (rule.required && (value === undefined || value === null || value === '')) {
      return fail(ErrorCode.BAD_REQUEST, `${rule.name} is required`)
    }
    if (value !== undefined && value !== null && typeof value !== rule.type) {
      return fail(ErrorCode.BAD_REQUEST, `${rule.name} must be ${rule.type}`)
    }
  }
  return null
}

async function getCurrentUser(): Promise<User | null> {
  return repo.findUserByOpenid(MOCK_CTX.OPENID)
}

async function mockUserMain(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  const action = data.action as string
  if (action === 'login') {
    let user = await getCurrentUser()
    if (!user) {
      user = await repo.createUser({
        openid: MOCK_CTX.OPENID,
        nickname: '',
        avatar: '',
        role: 'user',
        createdAt: Date.now(),
      })
    }
    return success({ openid: user.openid, role: user.role, nickname: user.nickname, avatar: user.avatar })
  }
  if (action === 'profile') {
    const validationError = validateParams(data, [
      { name: 'nickname', type: 'string', required: true },
      { name: 'avatar', type: 'string', required: true },
    ])
    if (validationError) return validationError
    if (!(await getCurrentUser())) return fail(ErrorCode.UNAUTHORIZED)
    return success(await repo.updateUser(MOCK_CTX.OPENID, {
      nickname: data.nickname as string,
      avatar: data.avatar as string,
    }))
  }
  return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${action}`)
}

async function mockBookMain(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  const action = data.action as string
  const user = await getCurrentUser()
  if (!user) return fail(ErrorCode.UNAUTHORIZED)

  if (action === 'list') {
    const page = (data.page as number) ?? 1
    const pageSize = (data.pageSize as number) ?? 20
    const result = await repo.listBooks(
      page,
      pageSize,
      data.keyword as string | undefined,
      (data.status as string) ?? 'online',
      data.keywordField as BookKeywordField | undefined,
      data.sortBy as BookSortField | undefined,
      data.sortOrder as BookSortOrder | undefined,
      data.tag as string | undefined,
    )
    return success({ ...result, page, pageSize })
  }
  if (action === 'detail') {
    const bookId = data.bookId as string
    if (!bookId) return fail(ErrorCode.BAD_REQUEST, 'bookId is required')
    const book = await repo.findBookById(bookId)
    return book ? success(book) : fail(ErrorCode.NOT_FOUND, 'Book not found')
  }
  if (action === 'create') {
    if (user.role !== 'admin') return fail(ErrorCode.FORBIDDEN, 'Admin only')
    const validationError = validateParams(data, [
      { name: 'title', type: 'string', required: true },
      { name: 'author', type: 'string', required: true },
      { name: 'isbn', type: 'string', required: true },
      { name: 'summary', type: 'string', required: true },
      { name: 'cover', type: 'string', required: true },
    ])
    if (validationError) return validationError
    const createTags = validateBookTags(data.tags)
    if (!createTags.valid) return fail(ErrorCode.BAD_REQUEST, createTags.message)
    const bookId = `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const now = Date.now()
    await repo.createBook({
      bookId,
      title: data.title as string,
      author: data.author as string,
      isbn: data.isbn as string,
      cover: data.cover as string,
      summary: data.summary as string,
      edition: data.edition as string | undefined,
      publisher: data.publisher as string | undefined,
      publishedAt: data.publishedAt as string | undefined,
      callNumber: data.callNumber as string | undefined,
      subjectTerms: data.subjectTerms as string | undefined,
      libraryName: data.libraryName as string | undefined,
      holdingsCount: data.holdingsCount as number | undefined,
      availableCount: data.availableCount as number | undefined,
      materialType: data.materialType as string | undefined,
      sourceRecordId: data.sourceRecordId as string | undefined,
      detailUrl: data.detailUrl as string | undefined,
      librarySource: data.librarySource as string | undefined,
      collectionStatus: data.collectionStatus as string | undefined,
      location: data.location as string | undefined,
      tags: createTags.tags,
      status: 'online',
      addedBy: user.openid,
      createdAt: now,
      updatedAt: now,
    })
    return success(bookId)
  }
  if (action === 'update') {
    if (user.role !== 'admin') return fail(ErrorCode.FORBIDDEN, 'Admin only')
    const bookId = data.bookId as string
    if (!bookId) return fail(ErrorCode.BAD_REQUEST, 'bookId is required')
    if (!(await repo.findBookById(bookId))) return fail(ErrorCode.NOT_FOUND, 'Book not found')
    if (data.tags !== undefined) {
      const tagsResult = validateBookTags(data.tags)
      if (!tagsResult.valid) return fail(ErrorCode.BAD_REQUEST, tagsResult.message)
    }
    const updates: Partial<Book> = {}
    const keys: Array<keyof Book> = [
      'title', 'author', 'isbn', 'cover', 'summary', 'edition', 'publisher', 'librarySource', 'collectionStatus', 'location',
      'publishedAt', 'callNumber', 'subjectTerms', 'libraryName', 'holdingsCount', 'availableCount', 'materialType', 'sourceRecordId', 'detailUrl',
    ]
    for (const key of keys) {
      const value = data[key]
      if (typeof value === 'string' || typeof value === 'number') {
        ;(updates as Record<string, unknown>)[key] = value
      }
    }
    if (data.tags !== undefined) {
      const updateTags = validateBookTags(data.tags)
      if (!updateTags.valid) return fail(ErrorCode.BAD_REQUEST, updateTags.message)
      updates.tags = updateTags.tags
    }
    await repo.updateBook(bookId, updates)
    return success('ok')
  }
  if (action === 'offline' || action === 'online') {
    if (user.role !== 'admin') return fail(ErrorCode.FORBIDDEN, 'Admin only')
    const bookId = data.bookId as string
    if (!bookId) return fail(ErrorCode.BAD_REQUEST, 'bookId is required')
    if (!(await repo.findBookById(bookId))) return fail(ErrorCode.NOT_FOUND, 'Book not found')
    await repo.updateBook(bookId, { status: action })
    return success('ok')
  }
  return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${action}`)
}

async function mockAiMain(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  const action = data.action as string
  const user = await getCurrentUser()
  if (!user) return fail(ErrorCode.UNAUTHORIZED)

  if (action === 'getConfig') {
    if (user.role !== 'admin') return fail(ErrorCode.FORBIDDEN, 'Admin only')
    return success(toAiProviderConfigView({}, await repo.getAiProviderConfig()))
  }

  if (action === 'updateConfig') {
    if (user.role !== 'admin') return fail(ErrorCode.FORBIDDEN, 'Admin only')
    const validation = validateAiProviderConfigUpdate({
      baseURL: data.baseURL as string | null | undefined,
      apiKey: data.apiKey as string | null | undefined,
    } satisfies AiProviderConfigUpdate)
    if (!validation.valid) return fail(ErrorCode.BAD_REQUEST, validation.message)
    const current = await repo.getAiProviderConfig()
    const nextConfig = applyAiProviderConfigUpdate(current, validation.update, user.openid)
    const saved = await repo.saveAiProviderConfig(nextConfig)
    return success(toAiProviderConfigView({}, saved))
  }

  if (action === 'chat') {
    const question = typeof data.question === 'string' ? data.question.trim() : ''
    const bookInput = data.book && typeof data.book === 'object' ? data.book as BookContextInput : undefined
    const bookId = typeof data.bookId === 'string' ? data.bookId : undefined
    const image = data.image && typeof data.image === 'object' ? data.image as AiImageInput : undefined
    if (!question && !image) return fail(ErrorCode.BAD_REQUEST, 'question is required unless an image is provided')
    if (!bookId && !bookInput?.title?.trim()) return fail(ErrorCode.BAD_REQUEST, 'book.title or bookId is required')
    const normalizedQuestion = question || DEFAULT_IMAGE_QUESTION
    if (normalizedQuestion.length + (typeof data.context === 'string' ? data.context.length : 0) > 1000) {
      return fail(ErrorCode.AI_LIMIT, 'Question is too long')
    }
    if (await repo.countTodayChats(user.openid) >= 50) return fail(ErrorCode.AI_LIMIT, 'Daily limit reached')
    if (image && (!image.fileId || !image.mimeType?.startsWith('image/'))) {
      return fail(ErrorCode.BAD_REQUEST, 'Invalid image input')
    }

    let book: Book | null = bookId ? await repo.findBookById(bookId) : null
    if (bookId && !book) return fail(ErrorCode.NOT_FOUND, 'Book not found')
    if (!book && bookInput?.title) {
      const syntheticId = `metadata_${encodeURIComponent(bookInput.title).slice(0, 80)}`
      const now = Date.now()
      book = {
        _id: syntheticId,
        bookId: syntheticId,
        title: bookInput.title,
        author: bookInput.author ?? '',
        edition: bookInput.edition,
        isbn: bookInput.isbn ?? '',
        cover: '',
        summary: '',
        status: 'online',
        addedBy: 'metadata-input',
        createdAt: now,
        updatedAt: now,
      }
    }
    if (!book) return fail(ErrorCode.NOT_FOUND, 'Book not found')
    if (bookId && bookInput?.title && book.title !== bookInput.title) {
      return fail(ErrorCode.BAD_REQUEST, 'book metadata does not match bookId')
    }

    let sessionId = typeof data.sessionId === 'string' ? data.sessionId : ''
    let session = sessionId ? await repo.findSessionById(sessionId) : null
    if (sessionId && (!session || session.openid !== user.openid)) return fail(ErrorCode.ACCESS_DENIED)
    if (session && session.bookId !== book.bookId) return fail(ErrorCode.BAD_REQUEST, 'Session belongs to another book')
    if (!session) {
      session = (await repo.listSessions(user.openid)).find((item) => item.bookId === book!.bookId) ?? null
    }
    if (!session) {
      session = await repo.createSession({
        openid: user.openid,
        bookId: book.bookId,
        title: `关于《${book.title}》的伴读`,
        createdAt: Date.now(),
      })
    }
    sessionId = session.sessionId

    const contextText = typeof data.context === 'string' && data.context.trim()
      ? `${normalizedQuestion}\n\nContext supplied by the reader:\n${data.context.trim()}`
      : normalizedQuestion
    const history = await repo.getSessionMessages(sessionId, 10)
    const hasImageContext = Boolean(image || history.some((item) => item.imageFileId))
    const system = `You are a careful reading companion. The platform has metadata but no full book text. title: ${book.title}; author: ${book.author || 'unknown'}; edition: ${book.edition || 'unknown'}; ISBN: ${book.isbn || 'unknown'}; summary: ${book.summary || 'not provided'}. Do not invent unsupported quotations or plot details.`
    let messages: OpenAIMultimodalChatMessage[]
    try {
      messages = [
        { role: 'system', content: system },
        ...await Promise.all(history.map(async (item) => ({
          role: item.role,
          content: item.imageFileId
            ? [
                { type: 'text' as const, text: item.content },
                { type: 'image_url' as const, image_url: { url: await storage.getTempFileURL(item.imageFileId) } },
              ]
            : item.content,
        }))),
        {
          role: 'user',
          content: image
            ? [
                { type: 'text', text: contextText },
                { type: 'image_url', image_url: { url: await storage.getTempFileURL(image.fileId) } },
              ]
            : contextText,
        },
      ]
    } catch {
      return fail(ErrorCode.STORAGE_ERROR, 'Unable to prepare the image for AI')
    }
    await repo.addMessage({
      sessionId,
      openid: user.openid,
      role: 'user',
      content: contextText,
      imageFileId: image?.fileId,
      imageMimeType: image?.mimeType,
      createdAt: Date.now(),
    })
    let reply: string
    try {
      reply = hasImageContext
        ? await aiClient.chatMultimodal(messages)
        : await aiClient.chat(messages as OpenAIChatMessage[])
    } catch {
      return fail(ErrorCode.AI_ERROR, 'AI service unavailable')
    }
    await repo.addMessage({ sessionId, openid: user.openid, role: 'assistant', content: reply, createdAt: Date.now() })
    return success({ reply, sessionId, usedImage: Boolean(image) })
  }

  if (action === 'loadHistory') {
    const sessionId = data.sessionId as string
    if (!sessionId) return fail(ErrorCode.BAD_REQUEST, 'sessionId is required')
    const session = await repo.findSessionById(sessionId)
    if (!session || session.openid !== user.openid) return fail(ErrorCode.ACCESS_DENIED)
    return success(await repo.getSessionMessages(sessionId, (data.limit as number) ?? 10))
  }
  if (action === 'listSessions') return success(await repo.listSessions(user.openid))
  return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${action}`)
}

async function mockNoteMain(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  const action = data.action as string
  const user = await getCurrentUser()
  if (!user) return fail(ErrorCode.UNAUTHORIZED)

  if (action === 'addNote') {
    const validationError = validateParams(data, [
      { name: 'bookId', type: 'string', required: true },
      { name: 'content', type: 'string', required: true },
    ])
    if (validationError) return validationError
    return success(await repo.addNote({
      openid: user.openid,
      bookId: data.bookId as string,
      content: data.content as string,
      createdAt: Date.now(),
    }))
  }
  if (action === 'listNote') {
    const page = (data.page as number) ?? 1
    const pageSize = (data.pageSize as number) ?? 20
    const result = await repo.listNotes(user.openid, page, pageSize)
    return success({ ...result, page, pageSize })
  }
  if (action === 'deleteNote') {
    const noteId = data.noteId as string
    if (!noteId) return fail(ErrorCode.BAD_REQUEST, 'noteId is required')
    const note = await repo.findNoteById(noteId)
    if (!note) return fail(ErrorCode.NOT_FOUND, 'Note not found')
    if (note.openid !== user.openid) return fail(ErrorCode.ACCESS_DENIED)
    await repo.deleteNote(noteId, user.openid)
    return success('ok')
  }
  if (action === 'checkIn') {
    const validationError = validateParams(data, [
      { name: 'bookId', type: 'string', required: true },
      { name: 'minutes', type: 'number', required: true },
    ])
    if (validationError) return validationError
    const minutes = data.minutes as number
    if (minutes < 1 || minutes > 1440) return fail(ErrorCode.BAD_REQUEST, 'Invalid minutes')
    const bookId = data.bookId as string
    await repo.addCheckin({
      openid: user.openid,
      bookId,
      minutes,
      checkinDate: new Date().toISOString().slice(0, 10),
    })
    await repo.addReadingEvent({
      openid: user.openid,
      bookId,
      eventType: 'checkin',
      duration: minutes,
      source: 'system',
      createdAt: Date.now(),
    })
    return success('ok')
  }
  if (action === 'checkInStat') return success(await repo.getCheckinStat(user.openid))
  return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${action}`)
}

async function mockReadingMain(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  const user = await getCurrentUser()
  if (!user) return fail(ErrorCode.UNAUTHORIZED)
  const action = data.action as string
  if (action === 'createPlan') {
    const bookId = data.bookId as string
    if (!bookId) return fail(ErrorCode.BAD_REQUEST, 'bookId is required')
    if (!(await repo.findBookById(bookId))) return fail(ErrorCode.NOT_FOUND, 'Book not found')
    const now = Date.now()
    const plan = await repo.createReadingPlan({
      openid: user.openid,
      bookId,
      targetDate: data.targetDate as string | undefined,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })
    await repo.addReadingEvent({ openid: user.openid, bookId, eventType: 'plan_started', source: 'system', createdAt: now })
    return success(plan)
  }
  if (action === 'listPlans') return success(await repo.listReadingPlans(user.openid))
  if (action === 'completePlan') {
    const planId = data.planId as string
    const plan = (await repo.listReadingPlans(user.openid)).find((item) => item.planId === planId)
    if (!plan) return fail(ErrorCode.NOT_FOUND, 'Reading plan not found')
    if (plan.status === 'completed') return success(plan)
    const updated = await repo.updateReadingPlan(planId, user.openid, { status: 'completed' })
    await repo.addReadingEvent({
      openid: user.openid,
      bookId: plan.bookId,
      eventType: 'plan_completed',
      source: 'system',
      createdAt: Date.now(),
    })
    return success(updated)
  }
  if (action === 'recordParticipation') {
    const eventType = data.eventType as ReadingEventType
    const bookId = data.bookId as string
    if (!bookId || (eventType !== 'discussion' && eventType !== 'group_activity')) {
      return fail(ErrorCode.FORBIDDEN, 'Only participation events can be user-recorded')
    }
    const groupId = data.groupId as string | undefined
    if (groupId && !(await repo.findCommunityMember(groupId, user.openid))) return fail(ErrorCode.ACCESS_DENIED)
    return success(await repo.addReadingEvent({
      openid: user.openid,
      bookId,
      eventType,
      source: 'user',
      groupId,
      classId: data.classId as string | undefined,
      createdAt: Date.now(),
    }))
  }
  if (action === 'listEvents') return success(await repo.listReadingEvents(user.openid, data.bookId as string | undefined))
  if (action === 'stat') return success(await repo.getReadingStat(user.openid))
  return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${action}`)
}

async function canManageGroup(user: User, groupId: string): Promise<boolean> {
  const group = await repo.findCommunityGroup(groupId)
  if (!group) return false
  if (user.role === 'admin' || group.ownerOpenid === user.openid) return true
  const member = await repo.findCommunityMember(groupId, user.openid)
  return member?.role === 'owner' || member?.role === 'teacher'
}

async function mockCommunityMain(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  const user = await getCurrentUser()
  if (!user) return fail(ErrorCode.UNAUTHORIZED)
  const action = data.action as string
  if (action === 'create') {
    const name = typeof data.name === 'string' ? data.name.trim() : ''
    const type = data.type as CommunityGroupType
    if (!name || (type !== 'class' && type !== 'reading_group')) return fail(ErrorCode.BAD_REQUEST)
    if (type === 'class' && user.role !== 'teacher' && user.role !== 'admin') return fail(ErrorCode.FORBIDDEN)
    const group = await repo.createCommunityGroup({
      name,
      type,
      ownerOpenid: user.openid,
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      createdAt: Date.now(),
    })
    await repo.addCommunityMember({
      groupId: group.groupId,
      openid: user.openid,
      role: type === 'class' ? 'teacher' : 'owner',
      joinedAt: Date.now(),
    })
    return success(group)
  }
  if (action === 'join') {
    const inviteCode = typeof data.inviteCode === 'string' ? data.inviteCode.trim().toUpperCase() : ''
    if (!inviteCode) return fail(ErrorCode.BAD_REQUEST, 'inviteCode is required')
    const group = await repo.findCommunityGroupByInviteCode(inviteCode)
    if (!group) return fail(ErrorCode.NOT_FOUND, 'Group not found')
    const existing = await repo.findCommunityMember(group.groupId, user.openid)
    return success(existing ?? await repo.addCommunityMember({
      groupId: group.groupId,
      openid: user.openid,
      role: 'member',
      joinedAt: Date.now(),
    }))
  }
  if (action === 'list') return success(await repo.listCommunityGroups(user.openid))
  if (action === 'members') {
    const groupId = data.groupId as string
    if (!groupId) return fail(ErrorCode.BAD_REQUEST, 'groupId is required')
    if (!(await repo.findCommunityMember(groupId, user.openid))) return fail(ErrorCode.ACCESS_DENIED)
    return success(await repo.listCommunityMembers(groupId))
  }
  return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${action}`)
}

async function mockTaskMain(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  const user = await getCurrentUser()
  if (!user) return fail(ErrorCode.UNAUTHORIZED)
  const action = data.action as string
  if (action === 'create') {
    const groupId = data.groupId as string
    const title = typeof data.title === 'string' ? data.title.trim() : ''
    const description = typeof data.description === 'string' ? data.description.trim() : ''
    if (!groupId || !title || !description) return fail(ErrorCode.BAD_REQUEST)
    if (!(await canManageGroup(user, groupId))) return fail(ErrorCode.FORBIDDEN)
    const bookId = data.bookId as string | undefined
    if (bookId && !(await repo.findBookById(bookId))) return fail(ErrorCode.NOT_FOUND, 'Book not found')
    return success(await repo.createTask({
      groupId,
      teacherOpenid: user.openid,
      bookId,
      title,
      description,
      dueAt: data.dueAt as number | undefined,
      createdAt: Date.now(),
      status: 'published',
    }))
  }
  if (action === 'list') {
    const groupIds = (await repo.listCommunityGroups(user.openid)).map((group) => group.groupId)
    return success(await repo.listTasksForUser(user.openid, groupIds))
  }
  if (action === 'detail') {
    const taskId = data.taskId as string
    const task = await repo.findTask(taskId)
    if (!task) return fail(ErrorCode.NOT_FOUND, 'Task not found')
    if (!(await repo.findCommunityMember(task.groupId, user.openid))) return fail(ErrorCode.ACCESS_DENIED)
    const submission = await repo.findTaskSubmission(taskId, user.openid)
    return success({ task, submission, feedback: submission ? await repo.listTaskFeedback(submission.submissionId) : [] })
  }
  if (action === 'submit') {
    const taskId = data.taskId as string
    const task = await repo.findTask(taskId)
    if (!task) return fail(ErrorCode.NOT_FOUND, 'Task not found')
    if (!(await repo.findCommunityMember(task.groupId, user.openid))) return fail(ErrorCode.ACCESS_DENIED)
    const text = typeof data.text === 'string' ? data.text.trim() : undefined
    const question = typeof data.question === 'string' ? data.question.trim() : undefined
    const imageFileId = data.imageFileId as string | undefined
    if (!text && !question && !imageFileId) return fail(ErrorCode.BAD_REQUEST, 'Submission is empty')
    const now = Date.now()
    const existing = await repo.findTaskSubmission(taskId, user.openid)
    const submission = existing
      ? await repo.updateTaskSubmission(existing.submissionId, { text, question, imageFileId, status: 'submitted' })
      : await repo.createTaskSubmission({
          taskId,
          openid: user.openid,
          text,
          question,
          imageFileId,
          status: 'submitted',
          createdAt: now,
          updatedAt: now,
        })
    if (!existing && task.bookId) {
      await repo.addReadingEvent({
        openid: user.openid,
        bookId: task.bookId,
        eventType: 'task_submitted',
        source: 'system',
        taskId,
        groupId: task.groupId,
        classId: task.groupId,
        createdAt: now,
      })
    }
    return success(submission)
  }
  if (action === 'submissions') {
    const taskId = data.taskId as string
    const task = await repo.findTask(taskId)
    if (!task) return fail(ErrorCode.NOT_FOUND)
    if (!(await canManageGroup(user, task.groupId))) return fail(ErrorCode.FORBIDDEN)
    return success(await repo.listTaskSubmissions(taskId))
  }
  if (action === 'feedback') {
    const submissionId = data.submissionId as string
    const comment = typeof data.comment === 'string' ? data.comment.trim() : ''
    if (!submissionId || !comment || typeof data.confirmed !== 'boolean') return fail(ErrorCode.BAD_REQUEST)
    const submission = await repo.findTaskSubmissionById(submissionId)
    if (!submission) return fail(ErrorCode.NOT_FOUND)
    const task = await repo.findTask(submission.taskId)
    if (!task || !(await canManageGroup(user, task.groupId))) return fail(ErrorCode.FORBIDDEN)
    const confirmed = data.confirmed as boolean
    const score = data.score as number | undefined
    if (score !== undefined && (score < 0 || score > 100)) return fail(ErrorCode.BAD_REQUEST)
    const prior = await repo.listTaskFeedback(submissionId)
    const feedback = await repo.addTaskFeedback({
      submissionId,
      teacherOpenid: user.openid,
      comment,
      score,
      confirmed,
      createdAt: Date.now(),
    })
    await repo.updateTaskSubmission(submissionId, { status: confirmed ? 'reviewed' : 'returned' })
    if (confirmed && task.bookId && !prior.some((item) => item.confirmed)) {
      await repo.addReadingEvent({
        openid: submission.openid,
        bookId: task.bookId,
        eventType: 'teacher_confirmed',
        source: 'teacher',
        points: score,
        taskId: task.taskId,
        groupId: task.groupId,
        classId: task.groupId,
        createdAt: Date.now(),
      })
    }
    return success(feedback)
  }
  return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${action}`)
}

async function mockReservationMain(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  const user = await getCurrentUser()
  if (!user) return fail(ErrorCode.UNAUTHORIZED)
  const action = data.action as string
  if (action === 'availability') {
    const book = await repo.findBookById(data.bookId as string)
    if (!book) return fail(ErrorCode.NOT_FOUND, 'Book not found')
    const available = book.collectionStatus?.toLowerCase() !== 'unavailable'
    return success({ bookId: book.bookId, available, location: book.location, message: 'Local mock only' })
  }
  if (action === 'reserve') {
    const bookId = data.bookId as string
    const book = await repo.findBookById(bookId)
    if (!book) return fail(ErrorCode.NOT_FOUND, 'Book not found')
    const existing = (await repo.listReservations(user.openid)).find(
      (item) => item.bookId === bookId && (item.status === 'pending' || item.status === 'confirmed'),
    )
    if (existing) return success(existing)
    if (book.collectionStatus?.toLowerCase() === 'unavailable') return fail(ErrorCode.BAD_REQUEST, 'Book unavailable')
    const now = Date.now()
    return success(await repo.createReservation({
      openid: user.openid,
      bookId,
      provider: 'mock-library',
      status: 'confirmed',
      externalId: `mock_${bookId}_${now}`,
      message: 'Local mock reservation; no real request was sent',
      createdAt: now,
      updatedAt: now,
    }))
  }
  if (action === 'cancel') {
    const reservationId = data.reservationId as string
    const reservation = await repo.findReservation(reservationId)
    if (!reservation) return fail(ErrorCode.NOT_FOUND)
    if (reservation.openid !== user.openid) return fail(ErrorCode.ACCESS_DENIED)
    return success(await repo.updateReservation(reservationId, user.openid, {
      status: 'cancelled',
      message: 'Local mock reservation cancelled',
    }))
  }
  if (action === 'list') return success(await repo.listReservations(user.openid))
  return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${action}`)
}

const EVENT_SCORE: Record<ReadingEventType, number> = {
  checkin: 1,
  plan_started: 0,
  plan_completed: 5,
  task_submitted: 2,
  teacher_confirmed: 10,
  group_activity: 2,
  discussion: 1,
}

async function mockRankingMain(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  const user = await getCurrentUser()
  if (!user) return fail(ErrorCode.UNAUTHORIZED)
  if (data.action === 'invalidate') {
    if (user.role !== 'admin' && user.role !== 'teacher') return fail(ErrorCode.FORBIDDEN, 'Only admin or teacher')
    const eventId = data.eventId as string | undefined
    const reason = typeof data.reason === 'string' ? data.reason.trim() : ''
    if (!eventId || !reason) return fail(ErrorCode.BAD_REQUEST, 'eventId and reason are required')
    const event = await repo.findReadingEvent(eventId)
    if (!event) return fail(ErrorCode.NOT_FOUND, 'Event not found')
    if (event.invalidated) return success(event)
    const updated = await repo.invalidateReadingEvent(eventId, user.openid, reason)
    return updated ? success(updated) : fail(ErrorCode.NOT_FOUND, 'Event not found')
  }
  if (data.action !== 'list') return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${data.action as string}`)
  const groupId = data.groupId as string | undefined
  let memberOpenids: Set<string> | null = null
  if (groupId) {
    if (!(await repo.findCommunityMember(groupId, user.openid))) return fail(ErrorCode.ACCESS_DENIED)
    memberOpenids = new Set((await repo.listCommunityMembers(groupId)).map((member) => member.openid))
  }
  const events = await repo.listAllReadingEvents(groupId)
  const grouped = new Map<string, ReadingEvent[]>()
  for (const event of events) {
    if (event.invalidated) continue
    if (memberOpenids && !memberOpenids.has(event.openid)) continue
    const current = grouped.get(event.openid) ?? []
    current.push(event)
    grouped.set(event.openid, current)
  }
  const users = new Map((await repo.listUsers()).map((item) => [item.openid, item]))
  const entries = Array.from(grouped.entries()).map(([openid, userEvents]) => {
    const checkinDays = new Set<string>()
    let score = 0
    let validEventCount = 0
    for (const event of userEvents) {
      const verified = event.eventType === 'teacher_confirmed'
        ? event.source === 'teacher'
        : event.eventType === 'discussion' || event.eventType === 'group_activity'
          ? true
          : event.source === 'system'
      if (!verified) continue
      if (event.eventType === 'checkin') {
        const key = `${event.bookId}:${new Date(event.createdAt).toISOString().slice(0, 10)}`
        if (checkinDays.has(key)) continue
        checkinDays.add(key)
      }
      score += EVENT_SCORE[event.eventType]
      if (event.eventType === 'teacher_confirmed' && event.points !== undefined) score += Math.max(0, Math.min(100, event.points)) / 10
      validEventCount += 1
    }
    return { rank: 0, openid, nickname: users.get(openid)?.nickname || 'Reader', score, validEventCount }
  }).filter((entry) => entry.validEventCount > 0)
    .sort((a, b) => b.score - a.score || b.validEventCount - a.validEventCount)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
  return success({ scope: groupId ? 'group' : 'global', groupId, generatedAt: Date.now(), entries })
}

async function mockLibraryMain(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  const user = await getCurrentUser()
  if (!user) return fail(ErrorCode.UNAUTHORIZED)
  if (data.action === 'search') {
    const page = (data.page as number) ?? 1
    const pageSize = (data.pageSize as number) ?? 20
    if (typeof data.isbn === 'string' && data.isbn) {
      const book = await repo.findBookByIsbn(data.isbn.replace(/[-\s]/g, ''))
      const list = book ? [book] : []
      return success<PaginatedData<Book>>({ list, total: list.length, page, pageSize })
    }
    const result = await repo.listBooks(page, pageSize, data.keyword as string | undefined, 'online', undefined, undefined, undefined, data.tag as string | undefined)
    return success<PaginatedData<Book>>({ ...result, page, pageSize })
  }
  if (data.action === 'import') {
    if (user.role !== 'admin') return fail(ErrorCode.FORBIDDEN)
    if (!Array.isArray(data.items) || data.items.length === 0) return fail(ErrorCode.BAD_REQUEST, 'items is required')
    const bookIds: string[] = []
    const failures: LibraryImportFailure[] = []
    for (let i = 0; i < data.items.length; i += 1) {
      const raw = data.items[i]
      if (!raw || typeof raw !== 'object') {
        failures.push({ index: i, reason: '数据格式错误' })
        continue
      }
      const item = raw as LibraryMetadata
      const tagsResult = validateBookTags(item.tags)
      if (!tagsResult.valid) {
        failures.push({ index: i, reason: tagsResult.message })
        continue
      }
      const title = item.title?.trim()
      const source = item.librarySource?.trim()
      const isbn = item.isbn?.replace(/[-\s]/g, '') ?? ''
      if (!title || !source || (isbn && await repo.findBookByIsbn(isbn))) {
        failures.push({
          index: i,
          reason: !title ? '缺少书名' : !source ? '缺少来源(librarySource)' : `ISBN 已存在: ${isbn}`,
        })
        continue
      }
      const bookId = `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const now = Date.now()
      await repo.createBook({
        bookId,
        title,
        author: item.author?.trim() ?? '',
        isbn,
        edition: item.edition?.trim(),
        publisher: item.publisher?.trim(),
        publishedAt: item.publishedAt?.trim(),
        callNumber: item.callNumber?.trim(),
        subjectTerms: item.subjectTerms?.trim(),
        libraryName: item.libraryName?.trim(),
        holdingsCount: item.holdingsCount,
        availableCount: item.availableCount,
        materialType: item.materialType?.trim(),
        sourceRecordId: item.sourceRecordId?.trim(),
        detailUrl: item.detailUrl?.trim(),
        cover: item.cover?.trim() ?? '',
        summary: item.summary?.trim() ?? '',
        librarySource: source,
        collectionStatus: item.collectionStatus?.trim(),
        location: item.location?.trim(),
        tags: tagsResult.tags,
        status: 'online',
        addedBy: user.openid,
        createdAt: now,
        updatedAt: now,
      })
      bookIds.push(bookId)
    }
    return success({ imported: bookIds.length, skipped: failures.length, bookIds, failures })
  }
  return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${data.action as string}`)
}

export async function callMockFunction<T = unknown>(
  functionName: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  let response: ApiResponse<unknown>
  switch (functionName) {
    case 'user': response = await mockUserMain(data); break
    case 'book': response = await mockBookMain(data); break
    case 'ai': response = await mockAiMain(data); break
    case 'note': response = await mockNoteMain(data); break
    case 'reading': response = await mockReadingMain(data); break
    case 'community': response = await mockCommunityMain(data); break
    case 'task': response = await mockTaskMain(data); break
    case 'reservation': response = await mockReservationMain(data); break
    case 'ranking': response = await mockRankingMain(data); break
    case 'library': response = await mockLibraryMain(data); break
    default: response = fail(ErrorCode.INTERNAL_ERROR, `Unknown cloud function: ${functionName}`)
  }
  return response as ApiResponse<T>
}
