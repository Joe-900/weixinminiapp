/**
 * @file Admin domain local mock tests
 * @description Test admin create/update/offline/online, permission, cover upload
 */

import { MemoryRepository } from '../mock/memoryRepository'
import { bookMain } from '../book/index'
import { ErrorCode } from '../../../src/types/common'
import { seedUsers, seedBooks, SEED_ADMIN_OPENID, SEED_USER_OPENID } from '../mock/seedData'
import type { Repository } from '../interfaces/repository'
import type { ApiResponse } from '../../../src/types/common'
import type { PaginatedData } from '../../../src/types/common'
import type { Book } from '../../../src/types/book'
import { LocalStorage } from '../mock/localStorage'

let repo: Repository
let storage: LocalStorage

beforeEach(() => {
  repo = new MemoryRepository()
  storage = new LocalStorage()
  ;(repo as MemoryRepository).seedUsers(seedUsers)
  ;(repo as MemoryRepository).seedBooks(seedBooks)
})

describe('Admin domain - create/update/offline/online', () => {
  test('Admin can create a book', async () => {
    const result = await bookMain(
      { action: 'create', title: 'New Book', author: 'Author', isbn: '123', summary: 'Summary', cover: 'cover.png' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    ) as ApiResponse<string>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    const book = await repo.findBookById(result.data!)
    expect(book).not.toBeNull()
    expect(book!.title).toBe('New Book')
  })

  test('Admin can update a book', async () => {
    const result = await bookMain(
      { action: 'update', bookId: 'book_001', title: 'Updated Title' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    ) as ApiResponse<string>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    const book = await repo.findBookById('book_001')
    expect(book!.title).toBe('Updated Title')
  })

  test('Non-admin cannot create a book, returns 1002', async () => {
    const result = await bookMain(
      { action: 'create', title: 'New Book', author: 'Author', isbn: '123', summary: 'Summary', cover: 'cover.png' },
      { OPENID: SEED_USER_OPENID },
      repo,
    )

    expect(result.code).toBe(ErrorCode.FORBIDDEN)
  })

  test('Cover upload returns mock fileID and can be stored', async () => {
    const fileID = await storage.upload('/tmp/test.png', 'covers/test.png')
    expect(fileID).toContain('local-mock://')

    const result = await bookMain(
      { action: 'create', title: 'Book with Cover', author: 'Author', isbn: '456', summary: 'Summary', cover: fileID },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    ) as ApiResponse<string>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    const book = await repo.findBookById(result.data!)
    expect(book!.cover).toBe(fileID)
  })

  test('After offline, list does not show the book but data still exists', async () => {
    await bookMain(
      { action: 'offline', bookId: 'book_001' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    )

    const listResult = await bookMain(
      { action: 'list', page: 1, pageSize: 10 },
      { OPENID: SEED_USER_OPENID },
      repo,
    ) as ApiResponse<PaginatedData<Book>>

    expect(listResult.data!.list.every((b) => b.status === 'online')).toBe(true)
    expect(listResult.data!.list.find((b) => b.bookId === 'book_001')).toBeUndefined()

    const book = await repo.findBookById('book_001')
    expect(book).not.toBeNull()
    expect(book!.status).toBe('offline')
  })
})
