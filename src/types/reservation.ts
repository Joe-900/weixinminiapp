/**
 * @file 预约系统数据类型定义
 */

export type ReservationType = 'BORROWING' | 'CROSS_CAMPUS' | 'SPECIAL_STACK'
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED' | 'REJECTED'
export type BookStatus = 'AVAILABLE' | 'BORROWED' | 'RESERVED'
export type StackType = 'NORMAL' | 'CENTER' | 'NEW'
export type NotificationType = 'SYSTEM' | 'EMAIL' | 'SMS'
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED'

export interface Book {
  bookId: string
  title: string
  author: string
  isbn: string
  publisher: string
  publishDate?: string
  callNumber: string
  stackType: StackType
  campus: string
  status: BookStatus
  inventory: number
  availableCount: number
  cover?: string
  summary?: string
}

export interface Reservation {
  reservationId: string
  bookId: string
  bookName: string
  isbn: string
  userId: string
  userName: string
  userPhone: string
  userEmail?: string
  reservationType: ReservationType
  campus: string
  targetCampus?: string
  stackType?: StackType
  status: ReservationStatus
  position: number
  estimatedTime: string
  pickupLocation: string
  createdAt: number
  updatedAt: number
  processedBy?: string
}

export interface Notification {
  notificationId: string
  reservationId: string
  userId: string
  type: NotificationType
  content: string
  status: NotificationStatus
  createdAt: number
}

export interface ReservationCreateParams {
  bookId: string
  bookName: string
  isbn: string
  campus: string
  pickupLocation?: string
}

export interface ReservationSearchParams {
  keyword?: string
  isbn?: string
  author?: string
  campus?: string
  stackType?: StackType
  page?: number
  pageSize?: number
}

export interface Campus {
  id: string
  name: string
  address: string
}

export interface PickupLocation {
  id: string
  name: string
  campus: string
}
