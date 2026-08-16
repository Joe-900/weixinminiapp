/**
 * @file AI domain pure business functions
 * @description Chat, loadHistory, listSessions with usage protection and error fallback
 */

import type { Repository } from '../interfaces/repository'
import type { AiClient } from '../interfaces/aiClient'
import type { Storage } from '../interfaces/storage'
import type { ApiResponse } from '../../../src/types/common'
import type {
  AiSession,
  AiMessage,
  ChatParams,
  ChatResult,
  OpenAIChatMessage,
  OpenAIMultimodalChatMessage,
} from '../../../src/types/ai'
import type { Book } from '../../../src/types/book'
import { success, fail } from '../common/response'
import { ErrorCode } from '../../../src/types/common'
import { validateParams } from '../common/validate'
import { AiClientError } from '../cloud/aiClientError'

const DEFAULT_HISTORY_LIMIT = 10
const DEFAULT_DAILY_LIMIT = 50
const DEFAULT_QUESTION_LENGTH_LIMIT = 1000

/**
 * Build system prompt with book context
 */
function buildSystemPrompt(book: Book, context?: string): string {
  const metadata = [
    `title: ${book.title}`,
    `author: ${book.author || 'unknown'}`,
    `edition: ${book.edition || 'unknown'}`,
    `ISBN: ${book.isbn || 'unknown'}`,
    `summary: ${book.summary || 'not provided'}`,
  ].join('; ')
  const userContext = context ? ` User-provided context: ${context}` : ''
  return `You are a careful reading companion. The platform only provides metadata, not the full text of the book. Book metadata: ${metadata}.${userContext} Do not invent quotations, chapters, or plot details that are not supported by the supplied context. If the evidence is insufficient, say so clearly and ask for a relevant excerpt or image.`
}

function buildBookFromParams(params: ChatParams, storedBook: Book | null): Book | null {
  if (storedBook) return storedBook
  if (params.bookId) return null
  if (!params.book?.title) return null
  const bookId = params.bookId ?? `metadata_${encodeURIComponent(params.book.title).slice(0, 80)}`
  const now = Date.now()
  return {
    _id: bookId,
    bookId,
    title: params.book.title,
    author: params.book.author ?? '',
    isbn: params.book.isbn ?? '',
    cover: '',
    summary: '',
    edition: params.book.edition,
    status: 'online',
    addedBy: 'metadata-input',
    createdAt: now,
    updatedAt: now,
  }
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
  storage?: Storage,
): Promise<ApiResponse<ChatResult>> {
  const validationError = validateParams<ChatResult>(
    params as unknown as Record<string, unknown>,
    [
      { name: 'question', type: 'string', required: true },
    ],
  )
  if (validationError) return validationError

  if (!params.bookId && !params.book?.title) {
    return fail(ErrorCode.BAD_REQUEST, 'book.title or bookId is required')
  }
  if (!params.question.trim() || (params.book && !params.book.title.trim())) {
    return fail(ErrorCode.BAD_REQUEST, 'book.title and question cannot be blank')
  }
  if (params.image && (!params.image.fileId || !params.image.mimeType.startsWith('image/'))) {
    return fail(ErrorCode.BAD_REQUEST, 'image.fileId and an image mimeType are required')
  }

  const questionLengthLimit = Number(env?.AI_QUESTION_LENGTH_LIMIT ?? DEFAULT_QUESTION_LENGTH_LIMIT)
  if (!Number.isInteger(questionLengthLimit) || questionLengthLimit < 1) {
    return fail(ErrorCode.INTERNAL_ERROR, 'Invalid AI_QUESTION_LENGTH_LIMIT configuration')
  }
  if (params.question.length + (params.context?.length ?? 0) > questionLengthLimit) {
    return fail(ErrorCode.AI_LIMIT, `Question too long, max ${questionLengthLimit} characters`)
  }

  const dailyLimit = Number(env?.AI_DAILY_LIMIT ?? DEFAULT_DAILY_LIMIT)
  if (!Number.isInteger(dailyLimit) || dailyLimit < 1) {
    return fail(ErrorCode.INTERNAL_ERROR, 'Invalid AI_DAILY_LIMIT configuration')
  }
  const todayCount = await repo.countTodayChats(openid)
  if (todayCount >= dailyLimit) {
    return fail(ErrorCode.AI_LIMIT, `Daily limit reached (${dailyLimit} times)`)
  }

  const book = buildBookFromParams(params, params.bookId ? await repo.findBookById(params.bookId) : null)
  if (!book) {
    return fail(ErrorCode.NOT_FOUND, 'Book not found')
  }

  if (params.book?.title && params.bookId && book.title !== params.book.title) {
    return fail(ErrorCode.BAD_REQUEST, 'book metadata does not match bookId')
  }

  let sessionId = params.sessionId ?? ''
  let session: AiSession | null = null

  if (sessionId) {
    session = await repo.findSessionById(sessionId)
    if (!session || session.openid !== openid) {
      return fail(ErrorCode.ACCESS_DENIED, 'Session not found or not yours')
    }
    if (session.bookId !== book.bookId) {
      return fail(ErrorCode.BAD_REQUEST, 'Session belongs to a different book')
    }
  } else {
    session = (await repo.listSessions(openid)).find((item) => item.bookId === book.bookId) ?? null
    if (!session) {
      session = await repo.createSession({
        openid,
        bookId: book.bookId,
        title: `关于《${book.title}》的伴读`,
        createdAt: Date.now(),
      })
    }
    sessionId = session.sessionId
  }

  const historyLimit = Number(env?.AI_HISTORY_LIMIT ?? DEFAULT_HISTORY_LIMIT)
  if (!Number.isInteger(historyLimit) || historyLimit < 1 || historyLimit > 100) {
    return fail(ErrorCode.INTERNAL_ERROR, 'Invalid AI_HISTORY_LIMIT configuration')
  }
  const historyMessages = await repo.getSessionMessages(sessionId, historyLimit)

  const textQuestion = params.context ? `${params.question}\n\nContext supplied by the reader:\n${params.context}` : params.question
  let imageUrl = ''
  if (params.image) {
    try {
      imageUrl = storage ? await storage.getTempFileURL(params.image.fileId) : params.image.fileId
    } catch {
      return fail(ErrorCode.AI_ERROR, 'Unable to prepare the image for AI')
    }
  }

  const messages: OpenAIMultimodalChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(book, params.context) },
    ...historyMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    {
      role: 'user',
      content: params.image
        ? [
            { type: 'text', text: textQuestion },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl,
              },
            },
          ]
        : textQuestion,
    },
  ]

  await repo.addMessage({
    sessionId,
    openid,
    role: 'user',
    content: textQuestion,
    imageFileId: params.image?.fileId,
    createdAt: Date.now(),
  })

  let reply: string
  try {
    if (params.image && aiClient.chatMultimodal) {
      reply = await aiClient.chatMultimodal(messages)
    } else if (params.image) {
      return fail(ErrorCode.AI_ERROR, 'This AI provider does not support image input')
    } else {
      reply = await aiClient.chat(messages as OpenAIChatMessage[])
    }
  } catch (err) {
    if (err instanceof AiClientError) {
      switch (err.kind) {
        case 'config_missing':
          return fail(ErrorCode.AI_CONFIG_MISSING, 'AI service is not configured correctly')
        case 'timeout':
          return fail(ErrorCode.AI_TIMEOUT, 'AI request timed out, please try again')
        case 'quota':
          return fail(ErrorCode.AI_QUOTA_EXCEEDED, 'AI quota exceeded, please contact the administrator')
        case 'invalid_response':
          return fail(ErrorCode.AI_INVALID_RESPONSE, 'AI returned an invalid response')
        default:
          return fail(ErrorCode.AI_ERROR, 'AI service unavailable, please try again later')
      }
    }
    return fail(ErrorCode.AI_ERROR, 'AI service unavailable, please try again later')
  }

  await repo.addMessage({
    sessionId,
    openid,
    role: 'assistant',
    content: reply,
    createdAt: Date.now(),
  })

  return success({ reply, sessionId, usedImage: Boolean(params.image) })
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
