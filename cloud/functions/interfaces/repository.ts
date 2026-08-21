/**
 * 数据访问抽象接口。
 */

import type { User } from '../../../src/types/user'
import type { Book, BookKeywordField, BookSortField, BookSortOrder } from '../../../src/types/book'
import type { Note, Checkin, CheckinStat } from '../../../src/types/note'
import type { AiProviderConfig, AiSession, AiMessage } from '../../../src/types/ai'
import type { ReadingEvent, ReadingStat, ReadingPlan } from '../../../src/types/reading'
import type { ClassGroup, CommunityMember } from '../../../src/types/community'
import type { ReadingTask, TaskSubmission, TaskFeedback } from '../../../src/types/task'
import type { Reservation, BookTransfer } from '../../../src/types/reservation'

export interface PageResult<T> {
  list: T[]
  total: number
}

export interface Repository {
  findUserByOpenid(openid: string): Promise<User | null>
  listUsers(): Promise<User[]>
  createUser(user: Omit<User, '_id'>): Promise<User>
  updateUser(openid: string, updates: Partial<User>): Promise<User>

  findBookById(bookId: string): Promise<Book | null>
  findBookByIsbn(isbn: string): Promise<Book | null>
  listBooks(
    page: number,
    pageSize: number,
    keyword?: string,
    status?: string,
    keywordField?: BookKeywordField,
    sortBy?: BookSortField,
    sortOrder?: BookSortOrder,
    tag?: string,
  ): Promise<PageResult<Book>>
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
  getAiProviderConfig(): Promise<AiProviderConfig | null>
  saveAiProviderConfig(config: Omit<AiProviderConfig, '_id'>): Promise<AiProviderConfig>

  addReadingEvent(event: Omit<ReadingEvent, '_id' | 'eventId'>): Promise<ReadingEvent>
  listReadingEvents(openid: string, bookId?: string): Promise<ReadingEvent[]>
  listAllReadingEvents(groupId?: string): Promise<ReadingEvent[]>
  findReadingEvent(eventId: string): Promise<ReadingEvent | null>
  invalidateReadingEvent(eventId: string, operator: string, reason: string): Promise<ReadingEvent | null>
  getReadingStat(openid: string): Promise<ReadingStat>
  createReadingPlan(plan: Omit<ReadingPlan, '_id' | 'planId'>): Promise<ReadingPlan>
  listReadingPlans(openid: string): Promise<ReadingPlan[]>
  updateReadingPlan(planId: string, openid: string, updates: Partial<ReadingPlan>): Promise<ReadingPlan>

  createCommunityGroup(group: Omit<ClassGroup, '_id' | 'groupId'>): Promise<ClassGroup>
  findCommunityGroup(groupId: string): Promise<ClassGroup | null>
  findCommunityGroupByInviteCode(inviteCode: string): Promise<ClassGroup | null>
  listCommunityGroups(openid: string): Promise<ClassGroup[]>
  addCommunityMember(member: Omit<CommunityMember, '_id' | 'memberId'>): Promise<CommunityMember>
  findCommunityMember(groupId: string, openid: string): Promise<CommunityMember | null>
  listCommunityMembers(groupId: string): Promise<CommunityMember[]>

  createTask(task: Omit<ReadingTask, '_id' | 'taskId'>): Promise<ReadingTask>
  findTask(taskId: string): Promise<ReadingTask | null>
  listTasksForUser(openid: string, groupIds: string[]): Promise<ReadingTask[]>
  createTaskSubmission(submission: Omit<TaskSubmission, '_id' | 'submissionId'>): Promise<TaskSubmission>
  findTaskSubmissionById(submissionId: string): Promise<TaskSubmission | null>
  findTaskSubmission(taskId: string, openid: string): Promise<TaskSubmission | null>
  listTaskSubmissions(taskId: string): Promise<TaskSubmission[]>
  updateTaskSubmission(submissionId: string, updates: Partial<TaskSubmission>): Promise<TaskSubmission>
  addTaskFeedback(feedback: Omit<TaskFeedback, '_id' | 'feedbackId'>): Promise<TaskFeedback>
  listTaskFeedback(submissionId: string): Promise<TaskFeedback[]>

  createReservation(reservation: Omit<Reservation, '_id' | 'reservationId'>): Promise<Reservation>
  findReservation(reservationId: string): Promise<Reservation | null>
  listReservations(openid: string): Promise<Reservation[]>
  updateReservation(reservationId: string, openid: string, updates: Partial<Reservation>): Promise<Reservation>

  createTransfer(transfer: Omit<BookTransfer, '_id' | 'transferId'>): Promise<BookTransfer>
  findTransfer(transferId: string): Promise<BookTransfer | null>
  listTransfers(openid: string): Promise<BookTransfer[]>
  updateTransfer(transferId: string, openid: string, updates: Partial<BookTransfer>): Promise<BookTransfer>
}
