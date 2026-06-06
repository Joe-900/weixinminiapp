/**
 * @file Note/Checkin domain cloud function entry
 * @description Auth then dispatch action to corresponding business function
 */

import type { ApiResponse } from '../../../src/types/common'
import type { Repository } from '../interfaces/repository'
import {
  handleAddNote,
  handleListNote,
  handleDeleteNote,
  handleCheckIn,
  handleCheckInStat,
} from './noteService'
import { authenticate } from '../common/auth'
import { fail } from '../common/response'
import { ErrorCode } from '../../../src/types/common'
import { validateParams } from '../common/validate'

interface NoteEvent {
  action?: string
  bookId?: string
  content?: string
  noteId?: string
  minutes?: number
  page?: number
  pageSize?: number
  [key: string]: unknown
}

interface CloudContext {
  OPENID?: string
}

export async function noteMain(
  event: NoteEvent,
  context: CloudContext,
  repo: Repository,
): Promise<ApiResponse<unknown>> {
  const openid = context.OPENID ?? ''

  const actionValidation = validateParams(event, [
    { name: 'action', type: 'string', required: true },
  ])
  if (actionValidation) return actionValidation

  switch (event.action) {
    case 'addNote': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error

      return handleAddNote(repo, openid, event.bookId ?? '', event.content ?? '')
    }

    case 'listNote': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error

      return handleListNote(repo, openid, event.page ?? 1, event.pageSize ?? 20)
    }

    case 'deleteNote': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error

      return handleDeleteNote(repo, openid, event.noteId ?? '')
    }

    case 'checkIn': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error

      return handleCheckIn(repo, openid, event.bookId ?? '', event.minutes ?? 0)
    }

    case 'checkInStat': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error

      return handleCheckInStat(repo, openid)
    }

    default:
      return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${event.action}`)
  }
}
