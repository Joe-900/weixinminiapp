/**
 * @file AI domain cloud function entry
 * @description Auth then dispatch action to corresponding business function
 */

import type { ApiResponse } from '../../../src/types/common'
import type { Repository } from '../interfaces/repository'
import type { AiClient } from '../interfaces/aiClient'
import type { Storage } from '../interfaces/storage'
import type { AiImageInput, BookContextInput } from '../../../src/types/ai'
import { handleChat, handleGetProviderConfig, handleLoadHistory, handleListSessions, handleUpdateProviderConfig } from './aiService'
import { authenticate } from '../common/auth'
import { fail } from '../common/response'
import { ErrorCode } from '../../../src/types/common'
import { validateParams } from '../common/validate'
import { mergeAiProviderEnvironment } from '../../../src/utils/aiProviderConfig'

interface AiEvent {
  action?: string
  bookId?: string
  book?: BookContextInput
  question?: string
  context?: string
  image?: AiImageInput
  sessionId?: string
  limit?: number
  baseURL?: string | null
  apiKey?: string | null
  [key: string]: unknown
}

interface CloudContext {
  OPENID?: string
}

export async function aiMain(
  event: AiEvent,
  context: CloudContext,
  repo: Repository,
  aiClient: AiClient,
  env?: Record<string, string | undefined>,
  storage?: Storage,
): Promise<ApiResponse<unknown>> {
  const openid = context.OPENID ?? ''

  const actionValidation = validateParams(event, [
    { name: 'action', type: 'string', required: true },
  ])
  if (actionValidation) return actionValidation

  switch (event.action) {
    case 'chat': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error

      let persisted
      try {
        persisted = await repo.getAiProviderConfig()
      } catch {
        return fail(ErrorCode.INTERNAL_ERROR, 'Unable to load AI provider configuration')
      }
      const effectiveEnv = mergeAiProviderEnvironment(env ?? {}, persisted)
      aiClient.configure?.(effectiveEnv)

      return handleChat(repo, aiClient, openid, {
        bookId: event.bookId,
        book: event.book,
        question: event.question ?? '',
        context: event.context,
        image: event.image,
        sessionId: event.sessionId,
      }, effectiveEnv, storage)
    }

    case 'loadHistory': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error

      return handleLoadHistory(repo, openid, event.sessionId ?? '', event.limit)
    }

    case 'listSessions': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error

      return handleListSessions(repo, openid)
    }

    case 'getConfig': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error
      return handleGetProviderConfig(repo, authResult.auth!, env ?? {})
    }

    case 'updateConfig': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error
      return handleUpdateProviderConfig(repo, authResult.auth!, {
        baseURL: event.baseURL,
        apiKey: event.apiKey,
      }, env ?? {})
    }

    default:
      return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${event.action}`)
  }
}

export { main } from './main'
