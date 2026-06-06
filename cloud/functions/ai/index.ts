/**
 * @file AI domain cloud function entry
 * @description Auth then dispatch action to corresponding business function
 */

import type { ApiResponse } from '../../../src/types/common'
import type { Repository } from '../interfaces/repository'
import type { AiClient } from '../interfaces/aiClient'
import { handleChat, handleLoadHistory, handleListSessions } from './aiService'
import { authenticate } from '../common/auth'
import { fail } from '../common/response'
import { ErrorCode } from '../../../src/types/common'
import { validateParams } from '../common/validate'

interface AiEvent {
  action?: string
  bookId?: string
  question?: string
  sessionId?: string
  limit?: number
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

      return handleChat(repo, aiClient, openid, {
        bookId: event.bookId ?? '',
        question: event.question ?? '',
        sessionId: event.sessionId,
      }, env)
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

    default:
      return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${event.action}`)
  }
}
