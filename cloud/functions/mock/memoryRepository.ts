/**
 * @file 基于内存�?Repository 实现
 * @description 本地 Mock 模式下使用内存数据库，提供与云数据库相同的接�?
 */

import type { Repository, PageResult } from '../interfaces/repository'
import type { User } from '../../../src/types/user'
import type { Book, BookKeywordField, BookSortField, BookSortOrder } from '../../../src/types/book'
import type { Note, Checkin, CheckinStat } from '../../../src/types/note'
import type { AiSession, AiMessage } from '../../../src/types/ai'
import type { ReadingEvent, ReadingPlan, ReadingStat } from '../../../src/types/reading'
import type { ClassGroup, CommunityMember } from '../../../src/types/community'
import type { ReadingTask, TaskSubmission, TaskFeedback } from '../../../src/types/task'
import type { Reservation } from '../../../src/types/reservation'

export class MemoryRepository implements Repository {
  private users: Map<string, User> = new Map()
  private books: Map<string, Book> = new Map()
  private notes: Map<string, Note> = new Map()
  private checkins: Map<string, Checkin> = new Map()
  private sessions: Map<string, AiSession> = new Map()
  private messages: Map<string, AiMessage> = new Map()
  private readingEvents: Map<string, ReadingEvent> = new Map()
  private readingPlans: Map<string, ReadingPlan> = new Map()
  private groups: Map<string, ClassGroup> = new Map()
  private members: Map<string, CommunityMember> = new Map()
  private tasks: Map<string, ReadingTask> = new Map()
  private submissions: Map<string, TaskSubmission> = new Map()
  private feedback: Map<string, TaskFeedback> = new Map()
  private reservations: Map<string, Reservation> = new Map()

  reset(): void {
    this.users.clear()
    this.books.clear()
    this.notes.clear()
    this.checkins.clear()
    this.sessions.clear()
    this.messages.clear()
    this.readingEvents.clear()
    this.readingPlans.clear()
    this.groups.clear()
    this.members.clear()
    this.tasks.clear()
    this.submissions.clear()
    this.feedback.clear()
    this.reservations.clear()
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

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values())
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

  async findBookByIsbn(isbn: string): Promise<Book | null> {
    return Array.from(this.books.values()).find((book) => book.isbn === isbn) ?? null
  }

  async listBooks(
    page: number,
    pageSize: number,
    keyword?: string,
    status?: string,
    keywordField: BookKeywordField = 'all',
    sortBy: BookSortField = 'createdAt',
    sortOrder: BookSortOrder = 'desc',
    tag?: string,
  ): Promise<PageResult<Book>> {
    let list = Array.from(this.books.values())

    if (status) {
      list = list.filter((b) => b.status === status)
    }
    if (tag) list = list.filter((b) => b.tags?.includes(tag))

    if (keyword) {
      const kw = keyword.toLowerCase()
      list = list.filter(
        (b) =>
          (keywordField !== 'author' && b.title.toLowerCase().includes(kw)) ||
          (keywordField !== 'title' && b.author.toLowerCase().includes(kw)),
      )
    }

    const direction = sortOrder === 'asc' ? 1 : -1
    list.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title, 'zh-Hans') * direction
      if (sortBy === 'author') return a.author.localeCompare(b.author, 'zh-Hans') * direction
      if (sortBy === 'availableCount') return ((a.availableCount ?? 0) - (b.availableCount ?? 0)) * direction
      return (a.createdAt - b.createdAt) * direction
    })

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

  private makeId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }

  async addReadingEvent(event: Omit<ReadingEvent, '_id' | 'eventId'>): Promise<ReadingEvent> {
    const eventId = this.makeId('event')
    const created: ReadingEvent = { ...event, _id: eventId, eventId }
    this.readingEvents.set(eventId, created)
    return created
  }

  async listReadingEvents(openid: string, bookId?: string): Promise<ReadingEvent[]> {
    return Array.from(this.readingEvents.values())
      .filter((event) => event.openid === openid && (!bookId || event.bookId === bookId))
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  async listAllReadingEvents(groupId?: string): Promise<ReadingEvent[]> {
    return Array.from(this.readingEvents.values())
      .filter((event) => !groupId || event.groupId === groupId || event.classId === groupId)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  async findReadingEvent(eventId: string): Promise<ReadingEvent | null> {
    return this.readingEvents.get(eventId) ?? null
  }

  async invalidateReadingEvent(eventId: string, operator: string, reason: string): Promise<ReadingEvent | null> {
    const existing = this.readingEvents.get(eventId)
    if (!existing) return null
    const now = Date.now()
    const updated: ReadingEvent = {
      ...existing,
      invalidated: true,
      invalidatedAt: now,
      invalidatedBy: operator,
      invalidateReason: reason,
    }
    this.readingEvents.set(eventId, updated)
    return updated
  }

  async getReadingStat(openid: string): Promise<ReadingStat> {
    const events = await this.listReadingEvents(openid)
    const checkins = Array.from(this.checkins.values()).filter((item) => item.openid === openid)
    const plans = Array.from(this.readingPlans.values()).filter((item) => item.openid === openid)
    return {
      streakDays: (await this.getCheckinStat(openid)).streakDays,
      totalMinutes: checkins.reduce((sum, item) => sum + item.minutes, 0),
      completedPlans: plans.filter((item) => item.status === 'completed').length,
      eventCount: events.length,
    }
  }

  async createReadingPlan(plan: Omit<ReadingPlan, '_id' | 'planId'>): Promise<ReadingPlan> {
    const planId = this.makeId('plan')
    const created: ReadingPlan = { ...plan, _id: planId, planId }
    this.readingPlans.set(planId, created)
    return created
  }

  async listReadingPlans(openid: string): Promise<ReadingPlan[]> {
    return Array.from(this.readingPlans.values())
      .filter((plan) => plan.openid === openid)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async updateReadingPlan(planId: string, openid: string, updates: Partial<ReadingPlan>): Promise<ReadingPlan> {
    const existing = this.readingPlans.get(planId)
    if (!existing || existing.openid !== openid) throw new Error('Reading plan not found')
    const updated = { ...existing, ...updates, updatedAt: Date.now() }
    this.readingPlans.set(planId, updated)
    return updated
  }

  async createCommunityGroup(group: Omit<ClassGroup, '_id' | 'groupId'>): Promise<ClassGroup> {
    const groupId = this.makeId('group')
    const created: ClassGroup = { ...group, _id: groupId, groupId }
    this.groups.set(groupId, created)
    return created
  }

  async findCommunityGroup(groupId: string): Promise<ClassGroup | null> {
    return this.groups.get(groupId) ?? null
  }

  async findCommunityGroupByInviteCode(inviteCode: string): Promise<ClassGroup | null> {
    return Array.from(this.groups.values()).find((group) => group.inviteCode === inviteCode) ?? null
  }

  async listCommunityGroups(openid: string): Promise<ClassGroup[]> {
    const memberGroupIds = new Set(
      Array.from(this.members.values()).filter((member) => member.openid === openid).map((member) => member.groupId),
    )
    return Array.from(this.groups.values()).filter(
      (group) => group.ownerOpenid === openid || memberGroupIds.has(group.groupId),
    )
  }

  async addCommunityMember(member: Omit<CommunityMember, '_id' | 'memberId'>): Promise<CommunityMember> {
    const memberId = this.makeId('member')
    const created: CommunityMember = { ...member, _id: memberId, memberId }
    this.members.set(memberId, created)
    return created
  }

  async findCommunityMember(groupId: string, openid: string): Promise<CommunityMember | null> {
    return Array.from(this.members.values()).find(
      (member) => member.groupId === groupId && member.openid === openid,
    ) ?? null
  }

  async listCommunityMembers(groupId: string): Promise<CommunityMember[]> {
    return Array.from(this.members.values()).filter((member) => member.groupId === groupId)
  }

  async createTask(task: Omit<ReadingTask, '_id' | 'taskId'>): Promise<ReadingTask> {
    const taskId = this.makeId('task')
    const created: ReadingTask = { ...task, _id: taskId, taskId }
    this.tasks.set(taskId, created)
    return created
  }

  async findTask(taskId: string): Promise<ReadingTask | null> {
    return this.tasks.get(taskId) ?? null
  }

  async listTasksForUser(openid: string, groupIds: string[]): Promise<ReadingTask[]> {
    const membershipLists = await Promise.all(groupIds.map((id) => this.listCommunityMembers(id)))
    const memberGroupIds = new Set(
      membershipLists.reduce<CommunityMember[]>((all, list) => all.concat(list), [])
        .filter((member) => member.openid === openid)
        .map((member) => member.groupId),
    )
    return Array.from(this.tasks.values()).filter((task) => memberGroupIds.has(task.groupId) && task.status === 'published')
  }

  async createTaskSubmission(submission: Omit<TaskSubmission, '_id' | 'submissionId'>): Promise<TaskSubmission> {
    const submissionId = this.makeId('submission')
    const created: TaskSubmission = { ...submission, _id: submissionId, submissionId }
    this.submissions.set(submissionId, created)
    return created
  }

  async findTaskSubmissionById(submissionId: string): Promise<TaskSubmission | null> {
    return this.submissions.get(submissionId) ?? null
  }

  async findTaskSubmission(taskId: string, openid: string): Promise<TaskSubmission | null> {
    return Array.from(this.submissions.values()).find(
      (submission) => submission.taskId === taskId && submission.openid === openid,
    ) ?? null
  }

  async listTaskSubmissions(taskId: string): Promise<TaskSubmission[]> {
    return Array.from(this.submissions.values())
      .filter((submission) => submission.taskId === taskId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }

  async updateTaskSubmission(submissionId: string, updates: Partial<TaskSubmission>): Promise<TaskSubmission> {
    const existing = this.submissions.get(submissionId)
    if (!existing) throw new Error('Task submission not found')
    const updated = { ...existing, ...updates, updatedAt: Date.now() }
    this.submissions.set(submissionId, updated)
    return updated
  }

  async addTaskFeedback(feedback: Omit<TaskFeedback, '_id' | 'feedbackId'>): Promise<TaskFeedback> {
    const feedbackId = this.makeId('feedback')
    const created: TaskFeedback = { ...feedback, _id: feedbackId, feedbackId }
    this.feedback.set(feedbackId, created)
    return created
  }

  async listTaskFeedback(submissionId: string): Promise<TaskFeedback[]> {
    return Array.from(this.feedback.values())
      .filter((item) => item.submissionId === submissionId)
      .sort((a, b) => a.createdAt - b.createdAt)
  }

  async createReservation(reservation: Omit<Reservation, '_id' | 'reservationId'>): Promise<Reservation> {
    const reservationId = this.makeId('reservation')
    const created: Reservation = { ...reservation, _id: reservationId, reservationId }
    this.reservations.set(reservationId, created)
    return created
  }

  async findReservation(reservationId: string): Promise<Reservation | null> {
    return this.reservations.get(reservationId) ?? null
  }

  async listReservations(openid: string): Promise<Reservation[]> {
    return Array.from(this.reservations.values())
      .filter((reservation) => reservation.openid === openid)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  async updateReservation(reservationId: string, openid: string, updates: Partial<Reservation>): Promise<Reservation> {
    const existing = this.reservations.get(reservationId)
    if (!existing || existing.openid !== openid) throw new Error('Reservation not found')
    const updated = { ...existing, ...updates, updatedAt: Date.now() }
    this.reservations.set(reservationId, updated)
    return updated
  }
}
