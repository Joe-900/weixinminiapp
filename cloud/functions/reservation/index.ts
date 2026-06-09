/**
 * @file 预约系统云函数入口
 */

import cloud from '@cloudbase/node-sdk'
import { successResponse, errorResponse } from '../common/response'
import { mockBooks, mockReservations, getReservationType } from '../mock/reservationMock'
import { MOCK_LOGIN_OPENID } from '../mock/seedData'

const app = cloud.init({ env: cloud.SYMBOL_CURRENT_ENV })
const db = app.database()

export async function main(event: { action: string; [key: string]: any }) {
  const { action } = event

  try {
    switch (action) {
      case 'searchBooks':
        return await searchBooks(event)
      case 'getBookDetail':
        return await getBookDetail(event)
      case 'checkBookStatus':
        return await checkBookStatus(event)
      case 'createReservation':
        return await createReservation(event)
      case 'getMyReservations':
        return await getMyReservations(event)
      case 'getReservationDetail':
        return await getReservationDetail(event)
      case 'cancelReservation':
        return await cancelReservation(event)
      case 'getAllReservations':
        return await getAllReservations(event)
      case 'confirmReservation':
        return await confirmReservation(event)
      case 'rejectReservation':
        return await rejectReservation(event)
      case 'completeReservation':
        return await completeReservation(event)
      default:
        return errorResponse(400, '无效的操作')
    }
  } catch (error) {
    console.error('Reservation error:', error)
    return errorResponse(500, '系统错误')
  }
}

async function searchBooks(event: { keyword?: string; isbn?: string; author?: string; campus?: string; stackType?: string; page?: number; pageSize?: number }) {
  let books = [...mockBooks]
  
  if (event.keyword) {
    const kw = event.keyword.toLowerCase()
    books = books.filter(
      (book) =>
        book.title.toLowerCase().includes(kw) ||
        book.author.toLowerCase().includes(kw) ||
        book.isbn.includes(kw)
    )
  }
  
  if (event.isbn) {
    books = books.filter((book) => book.isbn.includes(event.isbn))
  }
  
  if (event.author) {
    books = books.filter((book) => book.author.includes(event.author))
  }
  
  if (event.campus) {
    books = books.filter((book) => book.campus === event.campus)
  }
  
  if (event.stackType) {
    books = books.filter((book) => book.stackType === event.stackType)
  }
  
  const page = event.page || 1
  const pageSize = event.pageSize || 10
  const start = (page - 1) * pageSize
  const end = start + pageSize
  
  return successResponse({
    list: books.slice(start, end),
    total: books.length,
    page,
    pageSize,
  })
}

async function getBookDetail(event: { bookId: string }) {
  const book = mockBooks.find((b) => b.bookId === event.bookId)
  if (!book) {
    return errorResponse(404, '图书不存在')
  }
  return successResponse(book)
}

async function checkBookStatus(event: { bookId: string }) {
  const book = mockBooks.find((b) => b.bookId === event.bookId)
  if (!book) {
    return errorResponse(404, '图书不存在')
  }
  
  const info = getReservationType(book)
  return successResponse({
    status: book.status,
    reservationType: info.type,
    estimatedTime: info.estimatedTime,
    position: info.position,
  })
}

async function createReservation(event: { bookId: string; bookName: string; isbn: string; campus: string; pickupLocation: string }) {
  const book = mockBooks.find((b) => b.bookId === event.bookId)
  if (!book) {
    return errorResponse(404, '图书不存在')
  }
  
  const info = getReservationType(book)
  
  const newReservation = {
    reservationId: `reservation_${Date.now()}`,
    bookId: event.bookId,
    bookName: event.bookName,
    isbn: event.isbn,
    userId: MOCK_LOGIN_OPENID,
    userName: '阅读者',
    userPhone: '13800138000',
    userEmail: 'reader@example.com',
    reservationType: info.type === 'DIRECT_BORROW' ? 'BORROWING' : info.type,
    campus: event.campus,
    stackType: book.stackType,
    status: 'PENDING' as const,
    position: info.position || 1,
    estimatedTime: info.estimatedTime,
    pickupLocation: event.pickupLocation,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  
  mockReservations.push(newReservation)
  
  return successResponse(newReservation)
}

async function getMyReservations(event: {}) {
  const userReservations = mockReservations.filter((r) => r.userId === MOCK_LOGIN_OPENID)
  return successResponse({
    list: userReservations,
    total: userReservations.length,
    page: 1,
    pageSize: 100,
  })
}

async function getReservationDetail(event: { reservationId: string }) {
  const reservation = mockReservations.find((r) => r.reservationId === event.reservationId)
  if (!reservation) {
    return errorResponse(404, '预约不存在')
  }
  return successResponse(reservation)
}

async function cancelReservation(event: { reservationId: string }) {
  const index = mockReservations.findIndex((r) => r.reservationId === event.reservationId)
  if (index === -1) {
    return errorResponse(404, '预约不存在')
  }
  
  mockReservations[index].status = 'CANCELLED'
  mockReservations[index].updatedAt = Date.now()
  
  return successResponse('取消成功')
}

async function getAllReservations(event: { type?: string; status?: string; page?: number; pageSize?: number }) {
  let reservations = [...mockReservations]
  
  if (event.type) {
    reservations = reservations.filter((r) => r.reservationType === event.type)
  }
  
  if (event.status) {
    reservations = reservations.filter((r) => r.status === event.status)
  }
  
  const page = event.page || 1
  const pageSize = event.pageSize || 10
  const start = (page - 1) * pageSize
  const end = start + pageSize
  
  return successResponse({
    list: reservations.slice(start, end),
    total: reservations.length,
    page,
    pageSize,
  })
}

async function confirmReservation(event: { reservationId: string }) {
  const index = mockReservations.findIndex((r) => r.reservationId === event.reservationId)
  if (index === -1) {
    return errorResponse(404, '预约不存在')
  }
  
  if (mockReservations[index].status !== 'PENDING') {
    return errorResponse(400, '只能确认待处理的预约')
  }
  
  mockReservations[index].status = 'CONFIRMED'
  mockReservations[index].updatedAt = Date.now()
  
  return successResponse('确认成功')
}

async function rejectReservation(event: { reservationId: string; reason: string }) {
  const index = mockReservations.findIndex((r) => r.reservationId === event.reservationId)
  if (index === -1) {
    return errorResponse(404, '预约不存在')
  }
  
  if (mockReservations[index].status === 'COMPLETED' || mockReservations[index].status === 'CANCELLED') {
    return errorResponse(400, '无法拒绝已完成或已取消的预约')
  }
  
  mockReservations[index].status = 'REJECTED'
  mockReservations[index].updatedAt = Date.now()
  
  return successResponse('拒绝成功')
}

async function completeReservation(event: { reservationId: string }) {
  const index = mockReservations.findIndex((r) => r.reservationId === event.reservationId)
  if (index === -1) {
    return errorResponse(404, '预约不存在')
  }
  
  if (mockReservations[index].status !== 'PROCESSING') {
    return errorResponse(400, '只能完成处理中的预约')
  }
  
  mockReservations[index].status = 'COMPLETED'
  mockReservations[index].updatedAt = Date.now()
  
  return successResponse('完成成功')
}
