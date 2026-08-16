/**
 * @file 基于云数据库�?Repository 实现
 * @description 线上模式使用微信云数据库进行数据访问
 * 需按官方最新文档核实：微信云开发数据库 API
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

interface CloudDbCollection {
  where(condition: Record<string, unknown>): CloudDbCollection
  add(data: Record<string, unknown>): Promise<{ _id: string }>
  doc(id: string): { update(data: Record<string, unknown>): Promise<{ updated: number }>; get(): Promise<{ data: Record<string, unknown> }>; remove(): Promise<{ deleted: number }> }
  update(data: Record<string, unknown>): Promise<{ updated: number }>
  remove(): Promise<{ deleted: number }>
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

  async listUsers(): Promise<User[]> {
    const res = await this.db.collection('user').get()
    return res.data as unknown as User[]
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
    const res = await this.db.collection('book').where({ bookId }).get()
    return (res.data[0] as unknown as Book) ?? null
  }

  async findBookByIsbn(isbn: string): Promise<Book | null> {
    const res = await this.db.collection('book').where({ isbn }).get()
    return (res.data[0] as unknown as Book) ?? null
  }

  async listBooks(
    page: number,
    pageSize: number,
    keyword?: string,
    status?: string,
    keywordField: BookKeywordField = 'all',
    sortBy: BookSortField = 'createdAt',
    sortOrder: BookSortOrder = 'desc',
  ): Promise<PageResult<Book>> {
    const condition: Record<string, unknown> = {}
    if (status) condition.status = status

    let query = this.db.collection('book').where(condition)

    if (keyword) {
      const pattern = { $regex: keyword, $options: 'i' }
      const keywordCondition = keywordField === 'author'
        ? { author: pattern }
        : keywordField === 'title'
          ? { title: pattern }
          : { $or: [{ title: pattern }, { author: pattern }] }
      query = this.db.collection('book').where({ ...condition, ...keywordCondition })
    }

    const countRes = await query.count()
    const total = countRes.total

    const res = await query
      .orderBy(sortBy, sortOrder)
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
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get()
    return (res.data as unknown as AiMessage[]).reverse()
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

  private makeId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }

  async addReadingEvent(event: Omit<ReadingEvent, '_id' | 'eventId'>): Promise<ReadingEvent> {
    const eventId = this.makeId('event')
    const created: ReadingEvent = { ...event, _id: eventId, eventId }
    await this.db.collection('reading_event').add({ ...created })
    return created
  }

  async listReadingEvents(openid: string, bookId?: string): Promise<ReadingEvent[]> {
    const condition: Record<string, unknown> = { openid }
    if (bookId) condition.bookId = bookId
    const result = await this.db.collection('reading_event').where(condition).orderBy('createdAt', 'desc').get()
    return result.data as unknown as ReadingEvent[]
  }

  async listAllReadingEvents(groupId?: string): Promise<ReadingEvent[]> {
    if (!groupId) {
      const result = await this.db.collection('reading_event').where({}).orderBy('createdAt', 'desc').get()
      return result.data as unknown as ReadingEvent[]
    }

    const [groupResult, classResult] = await Promise.all([
      this.db.collection('reading_event').where({ groupId }).orderBy('createdAt', 'desc').get(),
      this.db.collection('reading_event').where({ classId: groupId }).orderBy('createdAt', 'desc').get(),
    ])
    const events = [...groupResult.data, ...classResult.data] as unknown as ReadingEvent[]
    return Array.from(new Map(events.map((event) => [event.eventId, event])).values())
  }

  async findReadingEvent(eventId: string): Promise<ReadingEvent | null> {
    const result = await this.db.collection('reading_event').where({ eventId }).limit(1).get()
    return (result.data[0] as unknown as ReadingEvent | undefined) ?? null
  }

  async invalidateReadingEvent(eventId: string, operator: string, reason: string): Promise<ReadingEvent | null> {
    const existing = await this.findReadingEvent(eventId)
    if (!existing) return null
    const now = Date.now()
    const updated: ReadingEvent = {
      ...existing,
      invalidated: true,
      invalidatedAt: now,
      invalidatedBy: operator,
      invalidateReason: reason,
    }
    await this.db.collection('reading_event').where({ eventId }).update({
      data: {
        invalidated: true,
        invalidatedAt: now,
        invalidatedBy: operator,
        invalidateReason: reason,
      },
    })
    return updated
  }

  async getReadingStat(openid: string): Promise<ReadingStat> {
    const [events, checkins, plans] = await Promise.all([
      this.listReadingEvents(openid),
      this.db.collection('checkin').where({ openid }).get(),
      this.db.collection('reading_plan').where({ openid }).get(),
    ])
    const checkinItems = checkins.data as unknown as Checkin[]
    const planItems = plans.data as unknown as ReadingPlan[]
    return {
      streakDays: (await this.getCheckinStat(openid)).streakDays,
      totalMinutes: checkinItems.reduce((sum, item) => sum + item.minutes, 0),
      completedPlans: planItems.filter((item) => item.status === 'completed').length,
      eventCount: events.length,
    }
  }

  async createReadingPlan(plan: Omit<ReadingPlan, '_id' | 'planId'>): Promise<ReadingPlan> {
    const planId = this.makeId('plan')
    const created: ReadingPlan = { ...plan, _id: planId, planId }
    await this.db.collection('reading_plan').add({ ...created })
    return created
  }

  async listReadingPlans(openid: string): Promise<ReadingPlan[]> {
    const result = await this.db.collection('reading_plan').where({ openid }).orderBy('updatedAt', 'desc').get()
    return result.data as unknown as ReadingPlan[]
  }

  async updateReadingPlan(planId: string, openid: string, updates: Partial<ReadingPlan>): Promise<ReadingPlan> {
    const existing = await this.db.collection('reading_plan').where({ planId, openid }).get()
    const current = existing.data[0] as unknown as ReadingPlan | undefined
    if (!current) throw new Error('Reading plan not found')
    const next = { ...updates, updatedAt: Date.now() }
    await this.db.collection('reading_plan').where({ planId, openid }).update(next)
    return { ...current, ...next }
  }

  async createCommunityGroup(group: Omit<ClassGroup, '_id' | 'groupId'>): Promise<ClassGroup> {
    const groupId = this.makeId('group')
    const created: ClassGroup = { ...group, _id: groupId, groupId }
    await this.db.collection('community_group').add({ ...created })
    return created
  }

  async findCommunityGroup(groupId: string): Promise<ClassGroup | null> {
    const result = await this.db.collection('community_group').where({ groupId }).get()
    return (result.data[0] as unknown as ClassGroup) ?? null
  }

  async findCommunityGroupByInviteCode(inviteCode: string): Promise<ClassGroup | null> {
    const result = await this.db.collection('community_group').where({ inviteCode }).get()
    return (result.data[0] as unknown as ClassGroup) ?? null
  }

  async listCommunityGroups(openid: string): Promise<ClassGroup[]> {
    const owned = await this.db.collection('community_group').where({ ownerOpenid: openid }).get()
    const memberships = await this.db.collection('community_member').where({ openid }).get()
    const ids = (memberships.data as Array<{ groupId: string }>).map((member) => member.groupId)
    const joined = ids.length === 0
      ? { data: [] as Record<string, unknown>[] }
      : await this.db.collection('community_group').where({ groupId: { $in: ids } }).get()
    const all = [...owned.data, ...joined.data] as unknown as ClassGroup[]
    return Array.from(new Map(all.map((group) => [group.groupId, group])).values())
  }

  async addCommunityMember(member: Omit<CommunityMember, '_id' | 'memberId'>): Promise<CommunityMember> {
    const memberId = this.makeId('member')
    const created: CommunityMember = { ...member, _id: memberId, memberId }
    await this.db.collection('community_member').add({ ...created })
    return created
  }

  async findCommunityMember(groupId: string, openid: string): Promise<CommunityMember | null> {
    const result = await this.db.collection('community_member').where({ groupId, openid }).get()
    return (result.data[0] as unknown as CommunityMember) ?? null
  }

  async listCommunityMembers(groupId: string): Promise<CommunityMember[]> {
    const result = await this.db.collection('community_member').where({ groupId }).get()
    return result.data as unknown as CommunityMember[]
  }

  async createTask(task: Omit<ReadingTask, '_id' | 'taskId'>): Promise<ReadingTask> {
    const taskId = this.makeId('task')
    const created: ReadingTask = { ...task, _id: taskId, taskId }
    await this.db.collection('reading_task').add({ ...created })
    return created
  }

  async findTask(taskId: string): Promise<ReadingTask | null> {
    const result = await this.db.collection('reading_task').where({ taskId }).get()
    return (result.data[0] as unknown as ReadingTask) ?? null
  }

  async listTasksForUser(openid: string, groupIds: string[]): Promise<ReadingTask[]> {
    if (groupIds.length === 0) return []
    const memberships = await Promise.all(groupIds.map((groupId) => this.listCommunityMembers(groupId)))
    const memberGroupIds = groupIds.filter((groupId, index) =>
      memberships[index].some((member) => member.openid === openid),
    )
    if (memberGroupIds.length === 0) return []
    const result = await this.db.collection('reading_task').where({ groupId: { $in: memberGroupIds }, status: 'published' }).get()
    return result.data as unknown as ReadingTask[]
  }

  async createTaskSubmission(submission: Omit<TaskSubmission, '_id' | 'submissionId'>): Promise<TaskSubmission> {
    const submissionId = this.makeId('submission')
    const created: TaskSubmission = { ...submission, _id: submissionId, submissionId }
    await this.db.collection('task_submission').add({ ...created })
    return created
  }

  async findTaskSubmissionById(submissionId: string): Promise<TaskSubmission | null> {
    const result = await this.db.collection('task_submission').where({ submissionId }).get()
    return (result.data[0] as unknown as TaskSubmission) ?? null
  }

  async findTaskSubmission(taskId: string, openid: string): Promise<TaskSubmission | null> {
    const result = await this.db.collection('task_submission').where({ taskId, openid }).get()
    return (result.data[0] as unknown as TaskSubmission) ?? null
  }

  async listTaskSubmissions(taskId: string): Promise<TaskSubmission[]> {
    const result = await this.db.collection('task_submission').where({ taskId }).orderBy('updatedAt', 'desc').get()
    return result.data as unknown as TaskSubmission[]
  }

  async updateTaskSubmission(submissionId: string, updates: Partial<TaskSubmission>): Promise<TaskSubmission> {
    const result = await this.db.collection('task_submission').where({ submissionId }).get()
    const current = result.data[0] as unknown as TaskSubmission | undefined
    if (!current) throw new Error('Task submission not found')
    const next = { ...updates, updatedAt: Date.now() }
    await this.db.collection('task_submission').where({ submissionId }).update(next)
    return { ...current, ...next }
  }

  async addTaskFeedback(feedback: Omit<TaskFeedback, '_id' | 'feedbackId'>): Promise<TaskFeedback> {
    const feedbackId = this.makeId('feedback')
    const created: TaskFeedback = { ...feedback, _id: feedbackId, feedbackId }
    await this.db.collection('task_feedback').add({ ...created })
    return created
  }

  async listTaskFeedback(submissionId: string): Promise<TaskFeedback[]> {
    const result = await this.db.collection('task_feedback').where({ submissionId }).orderBy('createdAt', 'asc').get()
    return result.data as unknown as TaskFeedback[]
  }

  async createReservation(reservation: Omit<Reservation, '_id' | 'reservationId'>): Promise<Reservation> {
    const reservationId = this.makeId('reservation')
    const created: Reservation = { ...reservation, _id: reservationId, reservationId }
    await this.db.collection('reservation').add({ ...created })
    return created
  }

  async findReservation(reservationId: string): Promise<Reservation | null> {
    const result = await this.db.collection('reservation').where({ reservationId }).get()
    return (result.data[0] as unknown as Reservation) ?? null
  }

  async listReservations(openid: string): Promise<Reservation[]> {
    const result = await this.db.collection('reservation').where({ openid }).orderBy('createdAt', 'desc').get()
    return result.data as unknown as Reservation[]
  }

  async updateReservation(reservationId: string, openid: string, updates: Partial<Reservation>): Promise<Reservation> {
    const result = await this.db.collection('reservation').where({ reservationId, openid }).get()
    const current = result.data[0] as unknown as Reservation | undefined
    if (!current) throw new Error('Reservation not found')
    const next = { ...updates, updatedAt: Date.now() }
    await this.db.collection('reservation').where({ reservationId, openid }).update(next)
    return { ...current, ...next }
  }
}
