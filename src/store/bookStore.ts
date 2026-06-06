/**
 * @file Book state management
 * @description Zustand store for book list cache and pagination
 */

import { create } from 'zustand'
import type { Book } from '../types/book'

interface BookState {
  bookList: Book[]
  total: number
  page: number
  pageSize: number
  loading: boolean
  keyword: string
  setBookList: (list: Book[], total: number, page: number) => void
  setLoading: (loading: boolean) => void
  setKeyword: (keyword: string) => void
  resetList: () => void
}

export const useBookStore = create<BookState>((set) => ({
  bookList: [],
  total: 0,
  page: 1,
  pageSize: 20,
  loading: false,
  keyword: '',

  setBookList: (list, total, page) =>
    set({ bookList: list, total, page }),

  setLoading: (loading) => set({ loading }),

  setKeyword: (keyword) => set({ keyword, page: 1, bookList: [] }),

  resetList: () => set({ bookList: [], total: 0, page: 1 }),
}))
