import type { Repository } from '../interfaces/repository'
import type { ApiResponse } from '../../../src/types/common'
import type { LibraryMetadata } from '../../../src/types/library'
import { authenticate } from '../common/auth'
import { ErrorCode } from '../../../src/types/common'
import { fail } from '../common/response'
import { validateParams } from '../common/validate'
import { handleImportLibraryMetadata, handleSearchLibraryMetadata } from './libraryService'

export { mapBuptLibraryRow, mapBuptLibraryRows } from './buptSourceAdapter'

interface LibraryEvent {
  action?: string
  items?: LibraryMetadata[]
  page?: number
  pageSize?: number
  keyword?: string
  isbn?: string
  [key: string]: unknown
}

export async function libraryMain(
  event: LibraryEvent,
  context: { OPENID?: string },
  repo: Repository,
): Promise<ApiResponse<unknown>> {
  const actionError = validateParams(event, [{ name: 'action', type: 'string', required: true }])
  if (actionError) return actionError
  const openid = context.OPENID ?? ''
  const authResult = await authenticate(repo, openid)
  if (authResult.error) return authResult.error

  switch (event.action) {
    case 'search':
      return handleSearchLibraryMetadata(repo, {
        page: event.page,
        pageSize: event.pageSize,
        keyword: event.keyword,
        isbn: event.isbn,
      })
    case 'import':
      return handleImportLibraryMetadata(repo, authResult.auth!, event.items ?? [])
    default:
      return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${event.action}`)
  }
}
