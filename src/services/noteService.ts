/**
 * @file Note/Checkin frontend service layer
 * @description Frontend cloud function call wrapper for note domain
 */

import { callFunction } from './request'
import type { ApiResponse, PaginatedData } from '../types/common'
import type { Note, CheckinStat, NoteListParams, AddNoteParams, CheckinParams } from '../types/note'

export async function addNote(params: AddNoteParams): Promise<ApiResponse<Note>> {
  return callFunction<Note>({
    name: 'note',
    data: { action: 'addNote', ...params },
  })
}

export async function listNote(params: NoteListParams): Promise<ApiResponse<PaginatedData<Note>>> {
  return callFunction<PaginatedData<Note>>({
    name: 'note',
    data: { action: 'listNote', ...params },
  })
}

export async function deleteNote(noteId: string): Promise<ApiResponse<string>> {
  return callFunction<string>({
    name: 'note',
    data: { action: 'deleteNote', noteId },
  })
}

export async function checkIn(params: CheckinParams): Promise<ApiResponse<string>> {
  return callFunction<string>({
    name: 'note',
    data: { action: 'checkIn', ...params },
  })
}

export async function checkInStat(): Promise<ApiResponse<CheckinStat>> {
  return callFunction<CheckinStat>({
    name: 'note',
    data: { action: 'checkInStat' },
  })
}
