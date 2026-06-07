/**
 * @file 本地Mock桥接（仅前端使用）
 * @description 本地模式直接调用mock业务函数，返回统一信封
 * 所有mock代码位于src/mock/，避免cloud/被编译到小程序产物
 */

import type { ApiResponse } from '../types/common'
import { ErrorCode, ERROR_MESSAGE_MAP } from '../types/common'
import { MemoryRepository } from '../mock/memoryRepository'
import { LocalStorage } from '../mock/localStorage'
import { MockAiClient } from '../mock/mockAiClient'
import { seedUsers, seedBooks, MOCK_LOGIN_OPENID } from '../mock/seedData'
import type { MockRepository } from '../mock/types'
import type { User, UserRole, LoginResult } from '../types/user'
import type { Book } from '../types/book'
import type { AiSession, AiMessage, ChatResult, OpenAIChatMessage } from '../types/ai'
import type { Note, CheckinStat } from '../types/note'
import type { PaginatedData } from '../types/common'

const repo = new MemoryRepository()
const storage = new LocalStorage()
const aiClient = new MockAiClient()

function initSeedData(): void {
  repo.seedUsers(seedUsers)
  repo.seedBooks(seedBooks)
}
initSeedData()

export function getMockDeps() {
  return { repo, storage, aiClient }
}

export function resetMockData(): void {
  repo.reset()
  initSeedData()
}

const MOCK_CTX = { OPENID: MOCK_LOGIN_OPENID }

function success<T>(data: T, message = '成功'): ApiResponse<T> {
  return { code: 0, message, data }
}

function fail<T = null>(code: number, message?: string): ApiResponse<T> {
  return { code, message: message ?? ERROR_MESSAGE_MAP[code] ?? '未知错误', data: null }
}

function validateParams(params: Record<string, unknown>, rules: Array<{ name: string; type: string; required: boolean }>): ApiResponse<null> | null {
  for (const rule of rules) {
    const value = params[rule.name]
    if (rule.required && (value === undefined || value === null || value === '')) {
      return { code: ErrorCode.BAD_REQUEST, message: `${rule.name}字段为必填项`, data: null }
    }
    if (value !== undefined && value !== null && typeof value !== rule.type) {
      return { code: ErrorCode.BAD_REQUEST, message: `${rule.name}字段类型错误`, data: null }
    }
  }
  return null
}

async function mockUserMain(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  const openid = MOCK_CTX.OPENID
  const action = data.action as string

  if (action === 'login') {
    if (!openid) return fail(ErrorCode.UNAUTHORIZED, '无法获取用户身份')
    let user = await repo.findUserByOpenid(openid)
    if (!user) {
      user = await repo.createUser({ openid, nickname: '', avatar: '', role: 'user', createdAt: Date.now() })
    }
    return success({ openid: user.openid, role: user.role, nickname: user.nickname, avatar: user.avatar })
  }

  if (action === 'profile') {
    const v = validateParams(data, [
      { name: 'nickname', type: 'string', required: true },
      { name: 'avatar', type: 'string', required: true },
    ])
    if (v) return v
    const user = await repo.findUserByOpenid(openid)
    if (!user) return fail(ErrorCode.UNAUTHORIZED, '用户不存在')
    const updated = await repo.updateUser(openid, { nickname: data.nickname as string, avatar: data.avatar as string })
    return success(updated)
  }

  return fail(ErrorCode.BAD_REQUEST, `未知操作：${action}`)
}

async function mockBookMain(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  const action = data.action as string
  const user = await repo.findUserByOpenid(MOCK_CTX.OPENID)
  if (!user) return fail(ErrorCode.UNAUTHORIZED)

  if (action === 'list') {
    const page = (data.page as number) ?? 1
    const pageSize = (data.pageSize as number) ?? 20
    const status = (data.status as string) ?? 'online'
    const result = await repo.listBooks(page, pageSize, data.keyword as string, status)
    return success({ list: result.list, total: result.total, page, pageSize })
  }

  if (action === 'detail') {
    const bookId = data.bookId as string
    if (!bookId) return fail(ErrorCode.BAD_REQUEST, 'bookId为必填项')
    const book = await repo.findBookById(bookId)
    if (!book) return fail(ErrorCode.NOT_FOUND, '书籍不存在')
    return success(book)
  }

  if (action === 'create') {
    if (user.role !== 'admin') return fail(ErrorCode.FORBIDDEN, '仅管理员可操作')
    const v = validateParams(data, [
      { name: 'title', type: 'string', required: true },
      { name: 'author', type: 'string', required: true },
      { name: 'isbn', type: 'string', required: true },
      { name: 'summary', type: 'string', required: true },
      { name: 'cover', type: 'string', required: true },
    ])
    if (v) return v
    const bookId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const now = Date.now()
    await repo.createBook({
      bookId, title: data.title as string, author: data.author as string,
      isbn: data.isbn as string, cover: data.cover as string, summary: data.summary as string,
      status: 'online', addedBy: user.openid, createdAt: now, updatedAt: now,
    })
    return success(bookId)
  }

  if (action === 'update') {
    if (user.role !== 'admin') return fail(ErrorCode.FORBIDDEN, '仅管理员可操作')
    const v = validateParams(data, [{ name: 'bookId', type: 'string', required: true }])
    if (v) return v
    const book = await repo.findBookById(data.bookId as string)
    if (!book) return fail(ErrorCode.NOT_FOUND, '书籍不存在')
    const updates: Partial<Book> = { updatedAt: Date.now() }
    if (data.title) updates.title = data.title as string
    if (data.author) updates.author = data.author as string
    if (data.isbn) updates.isbn = data.isbn as string
    if (data.summary) updates.summary = data.summary as string
    if (data.cover) updates.cover = data.cover as string
    await repo.updateBook(data.bookId as string, updates)
    return success('ok')
  }

  if (action === 'offline') {
    if (user.role !== 'admin') return fail(ErrorCode.FORBIDDEN, '仅管理员可操作')
    const bookId = data.bookId as string
    if (!bookId) return fail(ErrorCode.BAD_REQUEST, 'bookId为必填项')
    const book = await repo.findBookById(bookId)
    if (!book) return fail(ErrorCode.NOT_FOUND, '书籍不存在')
    await repo.updateBook(bookId, { status: 'offline', updatedAt: Date.now() })
    return success('ok')
  }

  if (action === 'online') {
    if (user.role !== 'admin') return fail(ErrorCode.FORBIDDEN, '仅管理员可操作')
    const bookId = data.bookId as string
    if (!bookId) return fail(ErrorCode.BAD_REQUEST, 'bookId为必填项')
    const book = await repo.findBookById(bookId)
    if (!book) return fail(ErrorCode.NOT_FOUND, '书籍不存在')
    await repo.updateBook(bookId, { status: 'online', updatedAt: Date.now() })
    return success('ok')
  }

  return fail(ErrorCode.BAD_REQUEST, `未知操作：${action}`)
}

async function mockAiMain(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  const action = data.action as string
  const openid = MOCK_CTX.OPENID
  const user = await repo.findUserByOpenid(openid)
  if (!user) return fail(ErrorCode.UNAUTHORIZED)

  if (action === 'chat') {
    const v = validateParams(data, [
      { name: 'bookId', type: 'string', required: true },
      { name: 'question', type: 'string', required: true },
    ])
    if (v) return v

    const bookId = data.bookId as string
    const question = data.question as string

    if (question.length > 1000) return fail(ErrorCode.AI_LIMIT, '问题过长')

    const todayCount = await repo.countTodayChats(openid)
    if (todayCount >= 50) return fail(ErrorCode.AI_LIMIT, '已达到每日使用上限')

    const book = await repo.findBookById(bookId)
    if (!book) return fail(ErrorCode.NOT_FOUND, '书籍不存在')

    let sessionId = data.sessionId as string | undefined
    if (!sessionId) {
      const session = await repo.createSession({
        openid, bookId, title: `关于《${book.title}》的对话`, createdAt: Date.now(),
      })
      sessionId = session.sessionId
    }

    const historyMessages = await repo.getSessionMessages(sessionId, 10)
    const messages: OpenAIChatMessage[] = [
      { role: 'system', content: `你是校园阅读伴读助手，服务于中学生读者。当前书籍信息如下：书名《${book.title}》，作者${book.author}，简介：${book.summary}。你的任务是基于上述书目信息，引导学生思考、激发阅读兴趣、解答与本书相关的阅读疑问。重要限制：你没有读过本书全文，只掌握以上书目信息，不要编造书中具体情节。回答风格：友善、鼓励、贴近中学生认知水平。` },
      ...historyMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: question },
    ]

    await repo.addMessage({ sessionId, openid, role: 'user', content: question, createdAt: Date.now() })

    let reply: string
    try {
      reply = await aiClient.chat(messages)
    } catch {
      return fail(ErrorCode.AI_ERROR, '伴读助手暂时无法使用')
    }

    await repo.addMessage({ sessionId, openid, role: 'assistant', content: reply, createdAt: Date.now() })
    return success({ reply, sessionId })
  }

  if (action === 'loadHistory') {
    const sessionId = data.sessionId as string
    if (!sessionId) return fail(ErrorCode.BAD_REQUEST, 'sessionId为必填项')
    const session = await repo.findSessionById(sessionId)
    if (!session || session.openid !== openid) return fail(ErrorCode.ACCESS_DENIED)
    const messages = await repo.getSessionMessages(sessionId, data.limit as number ?? 10)
    return success(messages)
  }

  if (action === 'listSessions') {
    const sessions = await repo.listSessions(openid)
    return success(sessions)
  }

  return fail(ErrorCode.BAD_REQUEST, `未知操作：${action}`)
}

async function mockNoteMain(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
  const action = data.action as string
  const openid = MOCK_CTX.OPENID
  const user = await repo.findUserByOpenid(openid)
  if (!user) return fail(ErrorCode.UNAUTHORIZED)

  if (action === 'addNote') {
    const v = validateParams(data, [
      { name: 'bookId', type: 'string', required: true },
      { name: 'content', type: 'string', required: true },
    ])
    if (v) return v
    const note = await repo.addNote({ openid, bookId: data.bookId as string, content: data.content as string, createdAt: Date.now() })
    return success(note)
  }

  if (action === 'listNote') {
    const page = (data.page as number) ?? 1
    const pageSize = (data.pageSize as number) ?? 20
    const result = await repo.listNotes(openid, page, pageSize)
    return success({ list: result.list, total: result.total, page, pageSize })
  }

  if (action === 'deleteNote') {
    const noteId = data.noteId as string
    if (!noteId) return fail(ErrorCode.BAD_REQUEST, 'noteId为必填项')
    const note = await repo.findNoteById(noteId)
    if (!note) return fail(ErrorCode.NOT_FOUND, '笔记不存在')
    if (note.openid !== openid) return fail(ErrorCode.ACCESS_DENIED)
    await repo.deleteNote(noteId, openid)
    return success('ok')
  }

  if (action === 'checkIn') {
    const v = validateParams(data, [
      { name: 'bookId', type: 'string', required: true },
      { name: 'minutes', type: 'number', required: true },
    ])
    if (v) return v
    const today = new Date().toISOString().split('T')[0]
    await repo.addCheckin({ openid, bookId: data.bookId as string, minutes: data.minutes as number, checkinDate: today })
    return success('ok')
  }

  if (action === 'checkInStat') {
    const stat = await repo.getCheckinStat(openid)
    return success(stat)
  }

  return fail(ErrorCode.BAD_REQUEST, `未知操作：${action}`)
}

export async function callMockFunction<T = unknown>(
  functionName: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  switch (functionName) {
    case 'user': return mockUserMain(data) as Promise<ApiResponse<T>>
    case 'book': return mockBookMain(data) as Promise<ApiResponse<T>>
    case 'ai': return mockAiMain(data) as Promise<ApiResponse<T>>
    case 'note': return mockNoteMain(data) as Promise<ApiResponse<T>>
    default: return { code: 5000, message: `未知云函数：${functionName}`, data: null }
  }
}
