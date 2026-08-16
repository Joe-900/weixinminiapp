import type { Repository } from '../interfaces/repository'
import type { AuthContext } from '../common/auth'
import type { ApiResponse, PaginatedData } from '../../../src/types/common'
import type { Book } from '../../../src/types/book'
import type { LibraryImportFailure, LibraryImportResult, LibraryMetadata, LibrarySearchParams } from '../../../src/types/library'
import { ErrorCode } from '../../../src/types/common'
import { fail, success } from '../common/response'
import { requireAdmin } from '../common/auth'

export function normalizeLibraryMetadata(input: LibraryMetadata): LibraryMetadata {
  return {
    title: input.title?.trim(),
    author: input.author?.trim(),
    isbn: input.isbn?.replace(/[-\s]/g, ''),
    edition: input.edition?.trim(),
    publisher: input.publisher?.trim(),
    publishedAt: input.publishedAt?.trim(),
    callNumber: input.callNumber?.trim(),
    subjectTerms: input.subjectTerms?.trim(),
    libraryName: input.libraryName?.trim(),
    holdingsCount: input.holdingsCount,
    availableCount: input.availableCount,
    materialType: input.materialType?.trim(),
    sourceRecordId: input.sourceRecordId?.trim(),
    detailUrl: input.detailUrl?.trim(),
    cover: input.cover?.trim(),
    summary: input.summary?.trim(),
    librarySource: input.librarySource?.trim(),
    collectionStatus: input.collectionStatus?.trim(),
    location: input.location?.trim(),
  }
}

export async function handleImportLibraryMetadata(
  repo: Repository,
  auth: AuthContext,
  items: LibraryMetadata[],
): Promise<ApiResponse<LibraryImportResult>> {
  const adminError = requireAdmin<LibraryImportResult>(auth)
  if (adminError) return adminError
  if (!Array.isArray(items) || items.length === 0) return fail(ErrorCode.BAD_REQUEST, 'items is required')
  if (items.length > 500) return fail(ErrorCode.BAD_REQUEST, 'At most 500 metadata records per import')

  const bookIds: string[] = []
  const failures: LibraryImportFailure[] = []
  for (let i = 0; i < items.length; i += 1) {
    const item = normalizeLibraryMetadata(items[i])
    if (!item.title || !item.librarySource) {
      failures.push({ index: i, reason: !item.title ? '缺少书名' : '缺少来源(librarySource)' })
      continue
    }
    if (item.isbn && await repo.findBookByIsbn(item.isbn)) {
      failures.push({ index: i, reason: `ISBN 已存在: ${item.isbn}` })
      continue
    }

    const bookId = `book_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const now = Date.now()
    await repo.createBook({
      bookId,
      title: item.title,
      author: item.author ?? '',
      isbn: item.isbn ?? '',
      edition: item.edition,
      publisher: item.publisher,
      publishedAt: item.publishedAt,
      callNumber: item.callNumber,
      subjectTerms: item.subjectTerms,
      libraryName: item.libraryName,
      holdingsCount: item.holdingsCount,
      availableCount: item.availableCount,
      materialType: item.materialType,
      sourceRecordId: item.sourceRecordId,
      detailUrl: item.detailUrl,
      cover: item.cover ?? '',
      summary: item.summary ?? '',
      librarySource: item.librarySource,
      collectionStatus: item.collectionStatus,
      location: item.location,
      status: 'online',
      addedBy: auth.openid,
      createdAt: now,
      updatedAt: now,
    })
    bookIds.push(bookId)
  }
  return success({ imported: bookIds.length, skipped: failures.length, bookIds, failures })
}

export async function handleSearchLibraryMetadata(
  repo: Repository,
  params: LibrarySearchParams,
): Promise<ApiResponse<PaginatedData<Book>>> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 20
  if (page < 1 || pageSize < 1 || pageSize > 100) {
    return fail(ErrorCode.BAD_REQUEST, 'Invalid pagination')
  }
  if (params.isbn) {
    const book = await repo.findBookByIsbn(params.isbn.replace(/[-\s]/g, ''))
    const list = book && book.status === 'online' ? [book] : []
    return success({ list, total: list.length, page, pageSize })
  }
  const result = await repo.listBooks(page, pageSize, params.keyword, 'online')
  return success({ ...result, page, pageSize })
}
