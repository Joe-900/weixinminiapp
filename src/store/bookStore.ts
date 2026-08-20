/**
 * @file Book state management
 * @description Zustand store for book list cache and pagination
 */

import { create } from 'zustand'
import type { Book, BookKeywordField, BookSortField, BookSortOrder } from '../types/book'

interface BookState {
  bookList: Book[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  keyword: string
  keywordField: BookKeywordField
  sortBy: BookSortField
  sortOrder: BookSortOrder
  tag: string
  setBookList: (list: Book[], total: number, page: number) => void
  setLoading: (loading: boolean) => void
  setKeyword: (keyword: string) => void
  setFilters: (keyword: string, keywordField: BookKeywordField, sortBy: BookSortField, sortOrder: BookSortOrder, tag: string) => void
  resetList: () => void
}

export const useBookStore = create<BookState>((set) => ({
  bookList: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  keyword: '',
  keywordField: 'all',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  tag: '',

  setBookList: (list, total, page) =>
    set({ bookList: list, total, page }),

  setLoading: (loading) => set({ loading }),

  setKeyword: (keyword) => set({ keyword, page: 1, bookList: [] }),

  setFilters: (keyword, keywordField, sortBy, sortOrder, tag) =>
    set({ keyword, keywordField, sortBy, sortOrder, tag, page: 1, bookList: [], total: 0 }),

  resetList: () => set({ bookList: [], total: 0, page: 1, keyword: '', keywordField: 'all', sortBy: 'createdAt', sortOrder: 'desc', tag: '' }),
}))
