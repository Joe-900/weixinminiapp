/**
 * @file AI domain pure business functions
 * @description Chat, loadHistory, listSessions with usage protection and error fallback
 */

import type { Repository } from '../interfaces/repository'
import type { AiClient } from '../interfaces/aiClient'
import type { ApiResponse } from '../../../src/types/common'
import type { AiSession, AiMessage, ChatParams, ChatResult, OpenAIChatMessage } from '../../../src/types/ai'
import type { Book } from '../../../src/types/book'
import { success, fail } from '../common/response'
import { ErrorCode } from '../../../src/types/common'
import { validateParams } from '../common/validate'

const DEFAULT_HISTORY_LIMIT = 10
const DEFAULT_DAILY_LIMIT = 50
const DEFAULT_QUESTION_LENGTH_LIMIT = 1000

/**
 * Build system prompt with book context
 */
function buildSystemPrompt(book: Book): string {
  return `You are a reading companion for the book "${book.title}" by ${book.author}. Summary: ${book.summary}. Help the reader understand and explore this book. Answer questions based on the book's content and context.`
}

/**
 * AI chat: create or continue a session
 */
export async function handleChat(
  repo: Repository,
  aiClient: AiClient,
  openid: string,
  params: ChatParams,
  env?: Record<string, string | undefined>,
): Promise<ApiResponse<ChatResult>> {
  const validationError = validateParams<ChatResult>(
    params as unknown as Record<string, unknown>,
    [
      { name: 'bookId', type: 'string', required: true },
      { name: 'question', type: 'string', required: true },
    ],
  )
  if (validationError) return validationError

  const questionLengthLimit = Number(env?.AI_QUESTION_LENGTH_LIMIT ?? DEFAULT_QUESTION_LENGTH_LIMIT)
  if (params.question.length > questionLengthLimit) {
    return fail(ErrorCode.AI_LIMIT, `Question too long, max ${questionLengthLimit} characters`)
  }

  const dailyLimit = Number(env?.AI_DAILY_LIMIT ?? DEFAULT_DAILY_LIMIT)
  const todayCount = await repo.countTodayChats(openid)
  if (todayCount >= dailyLimit) {
    return fail(ErrorCode.AI_LIMIT, `Daily limit reached (${dailyLimit} times)`)
  }

  const book = await repo.findBookById(params.bookId)
  if (!book) {
    return fail(ErrorCode.NOT_FOUND, 'Book not found')
  }

  let sessionId = params.sessionId ?? ''
  let session: AiSession | null = null

  if (sessionId) {
    session = await repo.findSessionById(sessionId)
    if (!session || session.openid !== openid) {
      return fail(ErrorCode.ACCESS_DENIED, 'Session not found or not yours')
    }
  } else {
    session = await repo.createSession({
      openid,
      bookId: params.bookId,
      title: `Chat about ${book.title}`,
      createdAt: Date.now(),
    })
    sessionId = session.sessionId
  }

  const historyLimit = Number(env?.AI_HISTORY_LIMIT ?? DEFAULT_HISTORY_LIMIT)
  const historyMessages = await repo.getSessionMessages(sessionId, historyLimit)

  const messages: OpenAIChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(book) },
    ...historyMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: params.question },
  ]

  await repo.addMessage({
    sessionId,
    openid,
    role: 'user',
    content: params.question,
    createdAt: Date.now(),
  })

  let reply: string
  try {
    reply = await aiClient.chat(messages)
  } catch {
    return fail(ErrorCode.AI_ERROR, 'AI service unavailable, please try again later')
  }

  await repo.addMessage({
    sessionId,
    openid,
    role: 'assistant',
    content: reply,
    createdAt: Date.now(),
  })

  return success({ reply, sessionId })
}

/**
 * Load session history messages
 */
export async function handleLoadHistory(
  repo: Repository,
  openid: string,
  sessionId: string,
  limit: number = DEFAULT_HISTORY_LIMIT,
): Promise<ApiResponse<AiMessage[]>> {
  if (!sessionId) {
    return fail(ErrorCode.BAD_REQUEST, 'sessionId is required')
  }

  const session = await repo.findSessionById(sessionId)
  if (!session || session.openid !== openid) {
    return fail(ErrorCode.ACCESS_DENIED, 'Session not found or not yours')
  }

  const messages = await repo.getSessionMessages(sessionId, limit)
  return success(messages)
}

/**
 * List user's AI sessions
 */
export async function handleListSessions(
  repo: Repository,
  openid: string,
): Promise<ApiResponse<AiSession[]>> {
  const sessions = await repo.listSessions(openid)
  return success(sessions)
}
