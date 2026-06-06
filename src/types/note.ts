/**
 * @file 笔记与打卡类型定义
 * @description note 集合与 checkin 集合的数据模型
 */

export interface Note {
  _id: string
  noteId: string
  openid: string
  bookId: string
  content: string
  createdAt: number
}

export interface NoteListParams {
  page: number
  pageSize: number
}

export interface AddNoteParams {
  bookId: string
  content: string
}

export interface Checkin {
  _id: string
  checkinId: string
  openid: string
  bookId: string
  minutes: number
  checkinDate: string
}

export interface CheckinParams {
  bookId: string
  minutes: number
}

export interface CheckinStat {
  streakDays: number
  totalMinutes: number
}
