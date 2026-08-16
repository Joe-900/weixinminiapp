/**
 * @file 书籍类型定义
 * @description 书籍集合的数据模型与相关请求/响应类型
 */

export type BookStatus = 'online' | 'offline'

export type BookKeywordField = 'all' | 'title' | 'author'
export type BookSortField = 'createdAt' | 'title' | 'author' | 'availableCount'
export type BookSortOrder = 'asc' | 'desc'

export interface Book {
  _id: string
  bookId: string
  title: string
  author: string
  isbn: string
  cover: string
  summary: string
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
  status: BookStatus
  addedBy: string
  createdAt: number
  updatedAt: number
}

export interface BookListParams {
  page: number
  pageSize: number
  keyword?: string
  keywordField?: BookKeywordField
  sortBy?: BookSortField
  sortOrder?: BookSortOrder
}

export interface BookCreateParams {
  title: string
  author: string
  isbn: string
  summary: string
  cover: string
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
}

export interface BookUpdateParams {
  bookId: string
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
}
