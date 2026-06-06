/**
 * @file Book domain frontend service layer
 * @description Frontend cloud function call wrapper for book domain
 */

import { callFunction } from './request'
import type { ApiResponse, PaginatedData } from '../types/common'
import type { Book, BookListParams, BookCreateParams, BookUpdateParams } from '../types/book'

export async function bookList(params: BookListParams): Promise<ApiResponse<PaginatedData<Book>>> {
  return callFunction<PaginatedData<Book>>({
    name: 'book',
    data: { action: 'list', ...params },
  })
}

export async function bookDetail(bookId: string): Promise<ApiResponse<Book>> {
  return callFunction<Book>({
    name: 'book',
    data: { action: 'detail', bookId },
  })
}

export async function bookCreate(params: BookCreateParams): Promise<ApiResponse<string>> {
  return callFunction<string>({
    name: 'book',
    data: { action: 'create', ...params },
  })
}

export async function bookUpdate(params: BookUpdateParams): Promise<ApiResponse<string>> {
  return callFunction<string>({
    name: 'book',
    data: { action: 'update', ...params },
  })
}

export async function bookOffline(bookId: string): Promise<ApiResponse<string>> {
  return callFunction<string>({
    name: 'book',
    data: { action: 'offline', bookId },
  })
}

export async function bookOnline(bookId: string): Promise<ApiResponse<string>> {
  return callFunction<string>({
    name: 'book',
    data: { action: 'online', bookId },
  })
}
