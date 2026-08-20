/**
 * @file Book domain pure business functions
 * @description Operate data through injected Repository, no direct cloud SDK calls
 */

import type { Repository } from '../interfaces/repository'
import type { ApiResponse, PaginatedData } from '../../../src/types/common'
import type {
  Book,
  BookCreateParams,
  BookUpdateParams,
  BookKeywordField,
  BookSortField,
  BookSortOrder,
} from '../../../src/types/book'
import { success, fail } from '../common/response'
import { ErrorCode } from '../../../src/types/common'
import { validateParams } from '../common/validate'
import type { AuthContext } from '../common/auth'
import { requireAdmin } from '../common/auth'
import { validateBookTags } from '../../../src/utils/bookTags'

export async function handleList(
  repo: Repository,
  page: number,
  pageSize: number,
  keyword?: string,
  status?: string,
  keywordField?: BookKeywordField,
  sortBy?: BookSortField,
  sortOrder?: BookSortOrder,
  tag?: string,
): Promise<ApiResponse<PaginatedData<Book>>> {
  const result = await repo.listBooks(page, pageSize, keyword, status, keywordField, sortBy, sortOrder, tag)
  return success({
    list: result.list,
    total: result.total,
    page,
    pageSize,
  })
}

export async function handleDetail(
  repo: Repository,
  bookId: string,
): Promise<ApiResponse<Book>> {
  if (!bookId) {
    return fail(ErrorCode.BAD_REQUEST, 'bookId is required')
  }
  const book = await repo.findBookById(bookId)
  if (!book) {
    return fail(ErrorCode.NOT_FOUND, 'Book not found')
  }
  return success(book)
}

export async function handleCreate(
  repo: Repository,
  auth: AuthContext,
  params: BookCreateParams,
): Promise<ApiResponse<string>> {
  const adminError = requireAdmin<string>(auth)
  if (adminError) return adminError

  const validationError = validateParams<string>(
    params as unknown as Record<string, unknown>,
    [
      { name: 'title', type: 'string', required: true },
      { name: 'author', type: 'string', required: true },
      { name: 'isbn', type: 'string', required: true },
      { name: 'summary', type: 'string', required: true },
      { name: 'cover', type: 'string', required: true },
    ],
  )
  if (validationError) return validationError

  const tagsResult = validateBookTags(params.tags)
  if (!tagsResult.valid) return fail(ErrorCode.BAD_REQUEST, tagsResult.message)

  const bookId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  const now = Date.now()

  await repo.createBook({
    bookId,
    title: params.title,
    author: params.author,
    isbn: params.isbn,
    cover: params.cover,
    summary: params.summary,
    edition: params.edition,
    publisher: params.publisher,
    publishedAt: params.publishedAt,
    callNumber: params.callNumber,
    subjectTerms: params.subjectTerms,
    libraryName: params.libraryName,
    holdingsCount: params.holdingsCount,
    availableCount: params.availableCount,
    materialType: params.materialType,
    sourceRecordId: params.sourceRecordId,
    detailUrl: params.detailUrl,
    librarySource: params.librarySource,
    collectionStatus: params.collectionStatus,
    location: params.location,
    tags: tagsResult.tags,
    status: 'online',
    addedBy: auth.openid,
    createdAt: now,
    updatedAt: now,
  })

  return success(bookId)
}

export async function handleUpdate(
  repo: Repository,
  auth: AuthContext,
  params: BookUpdateParams,
): Promise<ApiResponse<string>> {
  const adminError = requireAdmin<string>(auth)
  if (adminError) return adminError

  const validationError = validateParams<string>(
    params as unknown as Record<string, unknown>,
    [{ name: 'bookId', type: 'string', required: true }],
  )
  if (validationError) return validationError

  const book = await repo.findBookById(params.bookId)
  if (!book) {
    return fail(ErrorCode.NOT_FOUND, 'Book not found')
  }

  const tagsResult = validateBookTags(params.tags)
  if (!tagsResult.valid) return fail(ErrorCode.BAD_REQUEST, tagsResult.message)

  const updates: Partial<Book> = { updatedAt: Date.now() }
  if (params.title !== undefined) updates.title = params.title
  if (params.author !== undefined) updates.author = params.author
  if (params.isbn !== undefined) updates.isbn = params.isbn
  if (params.summary !== undefined) updates.summary = params.summary
  if (params.cover !== undefined) updates.cover = params.cover
  if (params.edition !== undefined) updates.edition = params.edition
  if (params.publisher !== undefined) updates.publisher = params.publisher
  if (params.publishedAt !== undefined) updates.publishedAt = params.publishedAt
  if (params.callNumber !== undefined) updates.callNumber = params.callNumber
  if (params.subjectTerms !== undefined) updates.subjectTerms = params.subjectTerms
  if (params.libraryName !== undefined) updates.libraryName = params.libraryName
  if (params.holdingsCount !== undefined) updates.holdingsCount = params.holdingsCount
  if (params.availableCount !== undefined) updates.availableCount = params.availableCount
  if (params.materialType !== undefined) updates.materialType = params.materialType
  if (params.sourceRecordId !== undefined) updates.sourceRecordId = params.sourceRecordId
  if (params.detailUrl !== undefined) updates.detailUrl = params.detailUrl
  if (params.librarySource !== undefined) updates.librarySource = params.librarySource
  if (params.collectionStatus !== undefined) updates.collectionStatus = params.collectionStatus
  if (params.location !== undefined) updates.location = params.location
  if (params.tags !== undefined) updates.tags = tagsResult.tags

  await repo.updateBook(params.bookId, updates)
  return success('ok')
}

export async function handleOffline(
  repo: Repository,
  auth: AuthContext,
  bookId: string,
): Promise<ApiResponse<string>> {
  const adminError = requireAdmin<string>(auth)
  if (adminError) return adminError

  if (!bookId) {
    return fail(ErrorCode.BAD_REQUEST, 'bookId is required')
  }

  const book = await repo.findBookById(bookId)
  if (!book) {
    return fail(ErrorCode.NOT_FOUND, 'Book not found')
  }

  await repo.updateBook(bookId, { status: 'offline', updatedAt: Date.now() })
  return success('ok')
}

export async function handleOnline(
  repo: Repository,
  auth: AuthContext,
  bookId: string,
): Promise<ApiResponse<string>> {
  const adminError = requireAdmin<string>(auth)
  if (adminError) return adminError

  if (!bookId) {
    return fail(ErrorCode.BAD_REQUEST, 'bookId is required')
  }

  const book = await repo.findBookById(bookId)
  if (!book) {
    return fail(ErrorCode.NOT_FOUND, 'Book not found')
  }

  await repo.updateBook(bookId, { status: 'online', updatedAt: Date.now() })
  return success('ok')
}
