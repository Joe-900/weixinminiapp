/**
 * @file Frontend mock repository for local mode
 * @description In-memory implementation for local mock mode, only references src/types
 */

import type { User } from '../types/user'
import type { Book } from '../types/book'
import type { Note, Checkin, CheckinStat } from '../types/note'
import type { AiSession, AiMessage } from '../types/ai'

export interface PageResult<T> {
  list: T[]
  total: number
}

export interface MockRepository {
  findUserByOpenid(openid: string): Promise<User | null>
  createUser(user: Omit<User, '_id'>): Promise<User>
  updateUser(openid: string, updates: Partial<User>): Promise<User>
  findBookById(bookId: string): Promise<Book | null>
  listBooks(page: number, pageSize: number, keyword?: string, status?: string): Promise<PageResult<Book>>
  createBook(book: Omit<Book, '_id'>): Promise<Book>
  updateBook(bookId: string, updates: Partial<Book>): Promise<Book>
  addNote(note: Omit<Note, '_id' | 'noteId'>): Promise<Note>
  listNotes(openid: string, page: number, pageSize: number): Promise<PageResult<Note>>
  deleteNote(noteId: string, openid: string): Promise<boolean>
  findNoteById(noteId: string): Promise<Note | null>
  addCheckin(checkin: Omit<Checkin, '_id' | 'checkinId'>): Promise<Checkin>
  getCheckinStat(openid: string): Promise<CheckinStat>
  createSession(session: Omit<AiSession, '_id' | 'sessionId'>): Promise<AiSession>
  findSessionById(sessionId: string): Promise<AiSession | null>
  listSessions(openid: string): Promise<AiSession[]>
  getSessionMessages(sessionId: string, limit: number): Promise<AiMessage[]>
  addMessage(message: Omit<AiMessage, '_id' | 'msgId'>): Promise<AiMessage>
  countTodayChats(openid: string): Promise<number>
  reset(): void
  seedUsers(users: User[]): void
  seedBooks(books: Book[]): void
}
