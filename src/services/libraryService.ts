import { callFunction } from './request'
import type { ApiResponse, PaginatedData } from '../types/common'
import type { Book } from '../types/book'
import type { LibraryImportResult, LibraryMetadata, LibrarySearchParams } from '../types/library'

export function searchLibrary(params: LibrarySearchParams): Promise<ApiResponse<PaginatedData<Book>>> {
  return callFunction({ name: 'library', data: { action: 'search', ...params } })
}

export function importLibraryMetadata(items: LibraryMetadata[]): Promise<ApiResponse<LibraryImportResult>> {
  return callFunction({ name: 'library', data: { action: 'import', items } })
}
