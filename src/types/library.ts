/**
 * Library metadata only. The platform deliberately does not persist book
 * full text or scanned chapters.
 */
export interface LibraryMetadata {
  title: string
  author?: string
  isbn?: string
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
  cover?: string
  summary?: string
  librarySource: string
  collectionStatus?: string
  location?: string
}

export interface LibrarySearchParams {
  page?: number
  pageSize?: number
  keyword?: string
  isbn?: string
}

export interface LibraryImportFailure {
  /** 在提交数组中的下标（从 0 开始） */
  index: number
  reason: string
}

export interface LibraryImportResult {
  imported: number
  skipped: number
  bookIds: string[]
  failures: LibraryImportFailure[]
}
