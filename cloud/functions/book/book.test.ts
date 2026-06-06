/**
 * @file Book domain local mock tests
 * @description Test list, detail, create, update, offline, online, permission, validation
 */

import { MemoryRepository } from '../mock/memoryRepository'
import { bookMain } from './index'
import { ErrorCode } from '../../../src/types/common'
import { seedUsers, seedBooks, SEED_ADMIN_OPENID, SEED_USER_OPENID } from '../mock/seedData'
import type { Repository } from '../interfaces/repository'
import type { ApiResponse } from '../../../src/types/common'
import type { PaginatedData } from '../../../src/types/common'
import type { Book } from '../../../src/types/book'

let repo: Repository

beforeEach(() => {
  repo = new MemoryRepository()
  ;(repo as MemoryRepository).seedUsers(seedUsers)
  ;(repo as MemoryRepository).seedBooks(seedBooks)
})

describe('Book domain - list', () => {
  test('list returns only online books by default', async () => {
    const result = await bookMain(
      { action: 'list', page: 1, pageSize: 10 },
      { OPENID: SEED_USER_OPENID },
      repo,
    ) as ApiResponse<PaginatedData<Book>>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data!.list.every((b) => b.status === 'online')).toBe(true)
  })

  test('list pagination returns correct count and total', async () => {
    const result = await bookMain(
      { action: 'list', page: 1, pageSize: 1 },
      { OPENID: SEED_USER_OPENID },
      repo,
    ) as ApiResponse<PaginatedData<Book>>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data!.list.length).toBe(1)
    expect(result.data!.total).toBe(2)
  })

  test('list with status filter returns offline books for admin', async () => {
    const result = await bookMain(
      { action: 'list', page: 1, pageSize: 10, status: 'offline' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    ) as ApiResponse<PaginatedData<Book>>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data!.list.length).toBe(1)
    expect(result.data!.list[0].status).toBe('offline')
  })
})

describe('Book domain - detail', () => {
  test('detail returns correct book metadata', async () => {
    const result = await bookMain(
      { action: 'detail', bookId: 'book_001' },
      { OPENID: SEED_USER_OPENID },
      repo,
    ) as ApiResponse<Book>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data!.title).toBe('Journey to the West')
    expect(result.data!.author).toBe('Wu Chengen')
  })

  test('detail with non-existent bookId returns 1004', async () => {
    const result = await bookMain(
      { action: 'detail', bookId: 'book_nonexist' },
      { OPENID: SEED_USER_OPENID },
      repo,
    )

    expect(result.code).toBe(ErrorCode.NOT_FOUND)
  })
})

describe('Book domain - create', () => {
  test('admin can create a book', async () => {
    const result = await bookMain(
      { action: 'create', title: 'New Book', author: 'Author', isbn: '123', summary: 'Summary', cover: 'cover.png' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    ) as ApiResponse<string>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data).toBeTruthy()

    const book = await repo.findBookById(result.data!)
    expect(book).not.toBeNull()
    expect(book!.title).toBe('New Book')
  })

  test('non-admin cannot create a book, returns 1002', async () => {
    const result = await bookMain(
      { action: 'create', title: 'New Book', author: 'Author', isbn: '123', summary: 'Summary', cover: 'cover.png' },
      { OPENID: SEED_USER_OPENID },
      repo,
    )

    expect(result.code).toBe(ErrorCode.FORBIDDEN)
  })

  test('create with missing title returns 1003', async () => {
    const result = await bookMain(
      { action: 'create', author: 'Author', isbn: '123', summary: 'Summary', cover: 'cover.png' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    )

    expect(result.code).toBe(ErrorCode.BAD_REQUEST)
    expect(result.message).toContain('title')
  })
})

describe('Book domain - offline/online', () => {
  test('offline changes status to offline, record still exists', async () => {
    const result = await bookMain(
      { action: 'offline', bookId: 'book_001' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    )

    expect(result.code).toBe(ErrorCode.SUCCESS)

    const book = await repo.findBookById('book_001')
    expect(book).not.toBeNull()
    expect(book!.status).toBe('offline')
  })

  test('online changes status back to online', async () => {
    await repo.updateBook('book_003', { status: 'offline' })

    const result = await bookMain(
      { action: 'online', bookId: 'book_003' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    )

    expect(result.code).toBe(ErrorCode.SUCCESS)

    const book = await repo.findBookById('book_003')
    expect(book!.status).toBe('online')
  })

  test('non-admin cannot offline a book, returns 1002', async () => {
    const result = await bookMain(
      { action: 'offline', bookId: 'book_001' },
      { OPENID: SEED_USER_OPENID },
      repo,
    )

    expect(result.code).toBe(ErrorCode.FORBIDDEN)
  })
})
