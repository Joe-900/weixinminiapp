/**
 * @file 基于云数据库�?Repository 实现
 * @description 线上模式使用微信云数据库进行数据访问
 * 需按官方最新文档核实：微信云开发数据库 API
 */

import type { Repository, PageResult } from '../interfaces/repository'
import type { User } from '../../../src/types/user'
import type { Book } from '../../../src/types/book'
import type { Note, Checkin, CheckinStat } from '../../../src/types/note'
import type { AiSession, AiMessage } from '../../../src/types/ai'

interface CloudDbCollection {
  where(condition: Record<string, unknown>): { get(): Promise<{ data: Record<string, unknown>[] }>; count(): Promise<{ total: number }> }
  add(data: Record<string, unknown>): Promise<{ _id: string }>
  doc(id: string): { update(data: Record<string, unknown>): Promise<{ updated: number }>; get(): Promise<{ data: Record<string, unknown> }>; remove(): Promise<{ deleted: number }> }
  skip(n: number): CloudDbCollection
  limit(n: number): CloudDbCollection
  orderBy(field: string, order: string): CloudDbCollection
  get(): Promise<{ data: Record<string, unknown>[] }>
  count(): Promise<{ total: number }>
}

interface CloudDb {
  collection(name: string): CloudDbCollection
}

export class CloudRepository implements Repository {
  private db: CloudDb

  constructor(db: CloudDb) {
    this.db = db
  }

  async findUserByOpenid(openid: string): Promise<User | null> {
    const res = await this.db.collection('user').where({ openid }).get()
    return (res.data[0] as unknown as User) ?? null
  }

  async createUser(user: Omit<User, '_id'>): Promise<User> {
    await this.db.collection('user').add({ ...user })
    return { ...user, _id: user.openid }
  }

  async updateUser(openid: string, updates: Partial<User>): Promise<User> {
    const existing = await this.findUserByOpenid(openid)
    if (!existing) throw new Error('User not found')
    await this.db.collection('user').where({ openid }).update({ ...updates })
    return { ...existing, ...updates }
  }

  async findBookById(bookId: string): Promise<Book | null> {
    try {
      const res = await this.db.collection('book').where({ bookId }).get()
      return (res.data[0] as unknown as Book) ?? null
    } catch {
      return null
    }
  }

  async listBooks(
    page: number,
    pageSize: number,
    keyword?: string,
    status?: string,
  ): Promise<PageResult<Book>> {
    const condition: Record<string, unknown> = {}
    if (status) condition.status = status

    let query = this.db.collection('book').where(condition)

    if (keyword) {
      query = this.db.collection('book').where({
        ...condition,
        title: { $regex: keyword, $options: 'i' },
      })
    }

    const countRes = await query.count()
    const total = countRes.total

    const res = await query
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return { list: res.data as unknown as Book[], total }
  }

  async createBook(book: Omit<Book, '_id'>): Promise<Book> {
    await this.db.collection('book').add({ ...book })
    return { ...book, _id: book.bookId }
  }

  async updateBook(bookId: string, updates: Partial<Book>): Promise<Book> {
    const existing = await this.findBookById(bookId)
    if (!existing) throw new Error('Book not found')
    await this.db.collection('book').where({ bookId }).update({ ...updates, updatedAt: Date.now() })
    return { ...existing, ...updates, updatedAt: Date.now() }
  }

  async addNote(note: Omit<Note, '_id' | 'noteId'>): Promise<Note> {
    const noteId = `note_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const newNote: Note = { ...note, _id: noteId, noteId }
    await this.db.collection('note').add({ ...newNote })
    return newNote
  }

  async listNotes(openid: string, page: number, pageSize: number): Promise<PageResult<Note>> {
    const countRes = await this.db.collection('note').where({ openid }).count()
    const total = countRes.total

    const res = await this.db
      .collection('note')
      .where({ openid })
      .orderBy('createdAt', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return { list: res.data as unknown as Note[], total }
  }

  async deleteNote(noteId: string, openid: string): Promise<boolean> {
    const note = await this.findNoteById(noteId)
    if (!note || note.openid !== openid) return false
    await this.db.collection('note').where({ noteId, openid }).remove()
    return true
  }

  async findNoteById(noteId: string): Promise<Note | null> {
    const res = await this.db.collection('note').where({ noteId }).get()
    return (res.data[0] as unknown as Note) ?? null
  }

  async addCheckin(checkin: Omit<Checkin, '_id' | 'checkinId'>): Promise<Checkin> {
    const checkinId = `checkin_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const newCheckin: Checkin = { ...checkin, _id: checkinId, checkinId }
    await this.db.collection('checkin').add({ ...newCheckin })
    return newCheckin
  }

  async getCheckinStat(openid: string): Promise<CheckinStat> {
    const res = await this.db.collection('checkin').where({ openid }).get()
    const userCheckins = (res.data as unknown as Checkin[]).sort((a, b) =>
      a.checkinDate.localeCompare(b.checkinDate),
    )

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
    await this.db.collection('ai_session').add({ ...newSession })
    return newSession
  }

  async findSessionById(sessionId: string): Promise<AiSession | null> {
    const res = await this.db.collection('ai_session').where({ sessionId }).get()
    return (res.data[0] as unknown as AiSession) ?? null
  }

  async listSessions(openid: string): Promise<AiSession[]> {
    const res = await this.db
      .collection('ai_session')
      .where({ openid })
      .orderBy('createdAt', 'desc')
      .get()
    return res.data as unknown as AiSession[]
  }

  async getSessionMessages(sessionId: string, limit: number): Promise<AiMessage[]> {
    const res = await this.db
      .collection('ai_message')
      .where({ sessionId })
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get()
    return res.data as unknown as AiMessage[]
  }

  async addMessage(message: Omit<AiMessage, '_id' | 'msgId'>): Promise<AiMessage> {
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    const newMessage: AiMessage = { ...message, _id: msgId, msgId }
    await this.db.collection('ai_message').add({ ...newMessage })
    return newMessage
  }

  async countTodayChats(openid: string): Promise<number> {
    const today = new Date().toISOString().split('T')[0]
    const startOfDay = new Date(today).getTime()
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000

    const res = await this.db
      .collection('ai_message')
      .where({
        openid,
        role: 'user',
        createdAt: { $gte: startOfDay, $lt: endOfDay },
      })
      .count()

    return res.total
  }
}
