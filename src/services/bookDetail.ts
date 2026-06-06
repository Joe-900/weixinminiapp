/**
 * @file Book detail service
 * @description Wrapper for book detail page
 */

import { callFunction } from './request'
import type { ApiResponse } from '../types/common'
import type { Book } from '../types/book'

export async function bookDetail(bookId: string): Promise<ApiResponse<Book>> {
  return callFunction<Book>({
    name: 'book',
    data: { action: 'detail', bookId },
  })
}
