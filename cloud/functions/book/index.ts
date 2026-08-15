/**
 * @file Book domain cloud function entry
 * @description Auth then dispatch action to corresponding business function
 */

import type { ApiResponse } from '../../../src/types/common'
import type { Repository } from '../interfaces/repository'
import {
  handleList,
  handleDetail,
  handleCreate,
  handleUpdate,
  handleOffline,
  handleOnline,
} from './bookService'
import { authenticate } from '../common/auth'
import { fail } from '../common/response'
import { ErrorCode } from '../../../src/types/common'
import { validateParams } from '../common/validate'

interface BookEvent {
  action?: string
  page?: number
  pageSize?: number
  keyword?: string
  bookId?: string
  title?: string
  author?: string
  isbn?: string
  summary?: string
  cover?: string
  edition?: string
  publisher?: string
  publishedAt?: string
  callNumber?: string
  subjectTerms?: string
  libraryName?: string
  holdingsCount?: number
  availableCount?: number
  materialType?: string
  sourceRecordId?: string
  detailUrl?: string
  librarySource?: string
  collectionStatus?: string
  location?: string
  status?: string
  [key: string]: unknown
}

interface CloudContext {
  OPENID?: string
}

export async function bookMain(
  event: BookEvent,
  context: CloudContext,
  repo: Repository,
): Promise<ApiResponse<unknown>> {
  const openid = context.OPENID ?? ''

  const actionValidation = validateParams(event, [
    { name: 'action', type: 'string', required: true },
  ])
  if (actionValidation) return actionValidation

  switch (event.action) {
    case 'list': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error

      return handleList(
        repo,
        event.page ?? 1,
        event.pageSize ?? 20,
        event.keyword,
        event.status ?? 'online',
      )
    }

    case 'detail': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error

      return handleDetail(repo, event.bookId ?? '')
    }

    case 'create': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error

      return handleCreate(repo, authResult.auth!, {
        title: event.title ?? '',
        author: event.author ?? '',
        isbn: event.isbn ?? '',
        summary: event.summary ?? '',
        cover: event.cover ?? '',
        edition: event.edition,
        publisher: event.publisher,
        publishedAt: event.publishedAt,
        callNumber: event.callNumber,
        subjectTerms: event.subjectTerms,
        libraryName: event.libraryName,
        holdingsCount: event.holdingsCount,
        availableCount: event.availableCount,
        materialType: event.materialType,
        sourceRecordId: event.sourceRecordId,
        detailUrl: event.detailUrl,
        librarySource: event.librarySource,
        collectionStatus: event.collectionStatus,
        location: event.location,
      })
    }

    case 'update': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error

      return handleUpdate(repo, authResult.auth!, {
        bookId: event.bookId ?? '',
        title: event.title,
        author: event.author,
        isbn: event.isbn,
        summary: event.summary,
        cover: event.cover,
        edition: event.edition,
        publisher: event.publisher,
        publishedAt: event.publishedAt,
        callNumber: event.callNumber,
        subjectTerms: event.subjectTerms,
        libraryName: event.libraryName,
        holdingsCount: event.holdingsCount,
        availableCount: event.availableCount,
        materialType: event.materialType,
        sourceRecordId: event.sourceRecordId,
        detailUrl: event.detailUrl,
        librarySource: event.librarySource,
        collectionStatus: event.collectionStatus,
        location: event.location,
      })
    }

    case 'offline': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error

      return handleOffline(repo, authResult.auth!, event.bookId ?? '')
    }

    case 'online': {
      const authResult = await authenticate(repo, openid)
      if (authResult.error) return authResult.error

      return handleOnline(repo, authResult.auth!, event.bookId ?? '')
    }

    default:
      return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${event.action}`)
  }
}
