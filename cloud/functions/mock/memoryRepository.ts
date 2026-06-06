/**
 * @file 基于内存�?Repository 实现
 * @description 本地 Mock 模式下使用内存数据库，提供与云数据库相同的接�?
 */

import type { Repository, PageResult } from '../interfaces/repository'
import type { User } from '../../../src/types/user'
import type { Book } from '../../../src/types/book'
import type { Note, Checkin, CheckinStat } from '../../../src/types/note'
import type { AiSession, AiMessage } from '../../../src/types/ai'

export class MemoryRepository implements Repository {
  private users: Map<string, User> = new Map()
  private books: Map<string, Book> = new Map()
  private notes: Map<string, Note> = new Map()
  private checkins: Map<string, Checkin> = new Map()
  private sessions: Map<string, AiSession> = new Map()
  private messages: Map<string, AiMessage> = new Map()

  reset(): void {
    this.users.clear()
    this.books.clear()
    this.notes.clear()
    this.checkins.clear()
    this.sessions.clear()
    this.messages.clear()
  }

  seedUsers(users: User[]): void {
    for (const u of users) this.users.set(u.openid, u)
  }

  seedBooks(books: Book[]): void {
    for (const b of books) this.books.set(b.bookId, b)
  }

  seedNotes(notes: Note[]): void {
    for (const n of notes) this.notes.set(n.noteId, n)
  }

  seedCheckins(checkins: Checkin[]): void {
    for (const c of checkins) this.checkins.set(c.checkinId, c)
  }

  seedSessions(sessions: AiSession[]): void {
    for (const s of sessions) this.sessions.set(s.sessionId, s)
  }

  seedMessages(messages: AiMessage[]): void {
    for (const m of messages) this.messages.set(m.msgId, m)
  }

  async findUserByOpenid(openid: string): Promise<User | null> {
    return this.users.get(openid) ?? null
  }

  async createUser(user: Omit<User, '_id'>): Promise<User> {
    const newUser: User = { ...user, _id: user.openid }
    this.users.set(user.openid, newUser)
    return newUser
  }

  async updateUser(openid: string, updates: Partial<User>): Promise<User> {
    const existing = this.users.get(openid)
    if (!existing) throw new Error('User not found')
    const updated = { ...existing, ...updates }
    this.users.set(openid, updated)
    return updated
  }

  async findBookById(bookId: string): Promise<Book | null> {
    return this.books.get(bookId) ?? null
  }

  async listBooks(
    page: number,
    pageSize: number,
    keyword?: string,
    status?: string,
  ): Promise<PageResult<Book>> {
    let list = Array.from(this.books.values())

    if (status) {
      list = list.filter((b) => b.status === status)
    }

    if (keyword) {
      const kw = keyword.toLowerCase()
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(kw) ||
          b.author.toLowerCase().includes(kw),
      )
    }

    list.sort((a, b) => b.createdAt - a.createdAt)

    const total = list.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const pagedList = list.slice(start, end)

    return { list: pagedList, total }
  }

  async createBook(book: Omit<Book, '_id'>): Promise<Book> {
    const newBook: Book = { ...book, _id: book.bookId }
    this.books.set(book.bookId, newBook)
    return newBook
  }

  async updateBook(bookId: string, updates: Partial<Book>): Promise<Book> {
    const existing = this.books.get(bookId)
    if (!existing) throw new Error('Book not found')
    const updated = { ...existing, ...updates, updatedAt: Date.now() }
    this.books.set(bookId, updated)
    return updated
  }

  async addNote(note: Omit<Note, '_id' | 'noteId'>): Promise<Note> {
    const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const newNote: Note = { ...note, _id: noteId, noteId }
    this.notes.set(noteId, newNote)
    return newNote
  }

  async listNotes(openid: string, page: number, pageSize: number): Promise<PageResult<Note>> {
    let list = Array.from(this.notes.values()).filter((n) => n.openid === openid)
    list.sort((a, b) => b.createdAt - a.createdAt)

    const total = list.length
    const start = (page - 1) * pageSize
    const end = start + pageSize
    const pagedList = list.slice(start, end)

    return { list: pagedList, total }
  }

  async deleteNote(noteId: string, openid: string): Promise<boolean> {
    const note = this.notes.get(noteId)
    if (!note) return false
    if (note.openid !== openid) return false
    this.notes.delete(noteId)
    return true
  }

  async findNoteById(noteId: string): Promise<Note | null> {
    return this.notes.get(noteId) ?? null
  }

  async addCheckin(checkin: Omit<Checkin, '_id' | 'checkinId'>): Promise<Checkin> {
    const checkinId = `checkin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const newCheckin: Checkin = { ...checkin, _id: checkinId, checkinId }
    this.checkins.set(checkinId, newCheckin)
    return newCheckin
  }

  async getCheckinStat(openid: string): Promise<CheckinStat> {
    const userCheckins = Array.from(this.checkins.values())
      .filter((c) => c.openid === openid)
      .sort((a, b) => a.checkinDate.localeCompare(b.checkinDate))

    const totalMinutes = userCheckins.reduce((sum, c) => sum + c.minutes, 0)

    let streakDays = 0
    const today = new Date().toISOString().split('T')[0]
    const dateSet = new Set(userCheckins.map((c) => c.checkinDate))

    let checkDate = today
    while (dateSet.has(checkDate)) {
      streakDays++
      const d = new Date(checkDate)
      d.setDate(d.getDate() - 1)
      checkDate = d.toISOString().split('T')[0]
    }

    return { streakDays, totalMinutes }
  }

  async createSession(session: Omit<AiSession, '_id' | 'sessionId'>): Promise<AiSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const newSession: AiSession = { ...session, _id: sessionId, sessionId }
    this.sessions.set(sessionId, newSession)
    return newSession
  }

  async findSessionById(sessionId: string): Promise<AiSession | null> {
    return this.sessions.get(sessionId) ?? null
  }

  async listSessions(openid: string): Promise<AiSession[]> {
    return Array.from(this.sessions.values())
      .filter((s) => s.openid === openid)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  async getSessionMessages(sessionId: string, limit: number): Promise<AiMessage[]> {
    const msgs = Array.from(this.messages.values())
      .filter((m) => m.sessionId === sessionId)
      .sort((a, b) => a.createdAt - b.createdAt)

    return msgs.slice(-limit)
  }

  async addMessage(message: Omit<AiMessage, '_id' | 'msgId'>): Promise<AiMessage> {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const newMessage: AiMessage = { ...message, _id: msgId, msgId }
    this.messages.set(msgId, newMessage)
    return newMessage
  }

  async countTodayChats(openid: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    const startOfDay = new Date(today).getTime()
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000

    const userSessionIds = new Set(
      Array.from(this.sessions.values())
        .filter((s) => s.openid === openid)
        .map((s) => s.sessionId),
    )

    return Array.from(this.messages.values()).filter(
      (m) =>
        userSessionIds.has(m.sessionId) &&
        m.role === 'user' &&
        m.createdAt >= startOfDay &&
        m.createdAt < endOfDay,
    ).length
  }
}
