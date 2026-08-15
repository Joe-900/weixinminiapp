/**
 * @file Note/Checkin domain pure business functions
 * @description addNote, listNote, deleteNote, checkIn, checkInStat
 */

import type { Repository } from '../interfaces/repository'
import type { ApiResponse, PaginatedData } from '../../../src/types/common'
import type { Note, CheckinStat } from '../../../src/types/note'
import { success, fail } from '../common/response'
import { ErrorCode } from '../../../src/types/common'
import { validateParams } from '../common/validate'
import { requireOwner } from '../common/auth'

export async function handleAddNote(
  repo: Repository,
  openid: string,
  bookId: string,
  content: string,
): Promise<ApiResponse<Note>> {
  const validationError = validateParams<Note>(
    { bookId, content } as unknown as Record<string, unknown>,
    [
      { name: 'bookId', type: 'string', required: true },
      { name: 'content', type: 'string', required: true },
    ],
  )
  if (validationError) return validationError

  const note = await repo.addNote({
    openid,
    bookId,
    content,
    createdAt: Date.now(),
  })

  return success(note)
}

export async function handleListNote(
  repo: Repository,
  openid: string,
  page: number,
  pageSize: number,
): Promise<ApiResponse<PaginatedData<Note>>> {
  const result = await repo.listNotes(openid, page, pageSize)
  return success({
    list: result.list,
    total: result.total,
    page,
    pageSize,
  })
}

export async function handleDeleteNote(
  repo: Repository,
  openid: string,
  noteId: string,
): Promise<ApiResponse<string>> {
  if (!noteId) {
    return fail(ErrorCode.BAD_REQUEST, 'noteId is required')
  }

  const note = await repo.findNoteById(noteId)
  if (!note) {
    return fail(ErrorCode.NOT_FOUND, 'Note not found')
  }

  const ownerError = requireOwner<string>({ openid, role: 'user', user: null }, note.openid)
  if (ownerError) return ownerError

  const deleted = await repo.deleteNote(noteId, openid)
  if (!deleted) {
    return fail(ErrorCode.INTERNAL_ERROR, 'Delete failed')
  }

  return success('ok')
}

export async function handleCheckIn(
  repo: Repository,
  openid: string,
  bookId: string,
  minutes: number,
): Promise<ApiResponse<string>> {
  const validationError = validateParams<string>(
    { bookId, minutes } as unknown as Record<string, unknown>,
    [
      { name: 'bookId', type: 'string', required: true },
      { name: 'minutes', type: 'number', required: true },
    ],
  )
  if (validationError) return validationError

  if (minutes < 1 || minutes > 1440) {
    return fail(ErrorCode.BAD_REQUEST, 'minutes must be between 1 and 1440')
  }

  const today = new Date().toISOString().split('T')[0]
  await repo.addCheckin({
    openid,
    bookId,
    minutes,
    checkinDate: today,
  })
  await repo.addReadingEvent({
    openid,
    bookId,
    eventType: 'checkin',
    duration: minutes,
    source: 'system',
    createdAt: Date.now(),
  })

  return success('ok')
}

export async function handleCheckInStat(
  repo: Repository,
  openid: string,
): Promise<ApiResponse<CheckinStat>> {
  const stat = await repo.getCheckinStat(openid)
  return success(stat)
}
