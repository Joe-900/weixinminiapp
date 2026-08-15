/**
 * @file Note/Checkin domain local mock tests
 * @description Test addNote, listNote, deleteNote, checkIn, checkInStat, data isolation
 */

import { MemoryRepository } from '../mock/memoryRepository'
import { noteMain } from './index'
import { ErrorCode } from '../../../src/types/common'
import type { ApiResponse, PaginatedData } from '../../../src/types/common'
import { seedUsers, SEED_USER_OPENID, SEED_ADMIN_OPENID } from '../mock/seedData'
import type { Repository } from '../interfaces/repository'
import type { Note, CheckinStat } from '../../../src/types/note'

let repo: Repository

beforeEach(() => {
  repo = new MemoryRepository()
  ;(repo as MemoryRepository).seedUsers(seedUsers)
})

const MOCK_CTX = { OPENID: SEED_USER_OPENID }

describe('Note domain - addNote', () => {
  test('addNote creates a record in the repository', async () => {
    const result = await noteMain(
      { action: 'addNote', bookId: 'book_001', content: 'Great book!' },
      MOCK_CTX,
      repo,
    ) as ApiResponse<Note>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data!.content).toBe('Great book!')
    expect(result.data!.openid).toBe(SEED_USER_OPENID)
  })

  test('addNote with missing content returns 1003', async () => {
    const result = await noteMain(
      { action: 'addNote', bookId: 'book_001' },
      MOCK_CTX,
      repo,
    )

    expect(result.code).toBe(ErrorCode.BAD_REQUEST)
  })
})

describe('Note domain - listNote', () => {
  test('listNote only returns current user notes', async () => {
    await noteMain(
      { action: 'addNote', bookId: 'book_001', content: 'My note' },
      MOCK_CTX,
      repo,
    )

    await noteMain(
      { action: 'addNote', bookId: 'book_001', content: 'Other note' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    )

    const result = await noteMain(
      { action: 'listNote', page: 1, pageSize: 10 },
      MOCK_CTX,
      repo,
    ) as ApiResponse<PaginatedData<Note>>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data!.list.every((n) => n.openid === SEED_USER_OPENID)).toBe(true)
  })
})

describe('Note domain - deleteNote', () => {
  test('deleteNote removes own note successfully', async () => {
    const addResult = await noteMain(
      { action: 'addNote', bookId: 'book_001', content: 'To delete' },
      MOCK_CTX,
      repo,
    ) as ApiResponse<Note>

    const noteId = addResult.data!.noteId

    const deleteResult = await noteMain(
      { action: 'deleteNote', noteId },
      MOCK_CTX,
      repo,
    )

    expect(deleteResult.code).toBe(ErrorCode.SUCCESS)
  })

  test('Reading another user note returns 1005', async () => {
    const addResult = await noteMain(
      { action: 'addNote', bookId: 'book_001', content: 'Admin note' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    ) as ApiResponse<Note>

    const noteId = addResult.data!.noteId

    const deleteResult = await noteMain(
      { action: 'deleteNote', noteId },
      MOCK_CTX,
      repo,
    )

    expect(deleteResult.code).toBe(ErrorCode.ACCESS_DENIED)
  })
})

describe('Note domain - checkIn', () => {
  test('checkIn writes successfully', async () => {
    const result = await noteMain(
      { action: 'checkIn', bookId: 'book_001', minutes: 30 },
      MOCK_CTX,
      repo,
    )

    expect(result.code).toBe(ErrorCode.SUCCESS)
  })

  test('checkIn with missing bookId returns 1003', async () => {
    const result = await noteMain(
      { action: 'checkIn', minutes: 30 },
      MOCK_CTX,
      repo,
    )

    expect(result.code).toBe(ErrorCode.BAD_REQUEST)
  })
})

describe('Note domain - checkInStat', () => {
  test('checkInStat returns streak days and total minutes', async () => {
    await noteMain(
      { action: 'checkIn', bookId: 'book_001', minutes: 30 },
      MOCK_CTX,
      repo,
    )

    const result = await noteMain(
      { action: 'checkInStat' },
      MOCK_CTX,
      repo,
    ) as ApiResponse<CheckinStat>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data!.totalMinutes).toBe(30)
  })
})
