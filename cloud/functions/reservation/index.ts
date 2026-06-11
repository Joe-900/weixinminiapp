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
      case 'getDatabaseBooks':
        return await getDatabaseBooks(event)
      default:
        return errorResponse(400, '无效的操作')
    }
  } catch (error) {
    console.error('Reservation error:', error)
    return errorResponse(500, '系统错误')
  }
}

async function searchBooks(event: { keyword?: string; isbn?: string; author?: string; campus?: string; stackType?: string; page?: number; pageSize?: number; useDb?: boolean }) {
  if (event.useDb) {
    return await searchBooksFromDb(event)
  }

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

async function searchBooksFromDb(event: { keyword?: string; isbn?: string; author?: string; page?: number; pageSize?: number }) {
  const collection = db.collection('books')
  let query = collection.where({ status: 'online' })

  if (event.keyword) {
    const kw = event.keyword.toLowerCase()
    query = query.or([
      { title: db.RegExp({ regexp: kw, options: 'i' }) },
      { author: db.RegExp({ regexp: kw, options: 'i' }) },
      { isbn: db.RegExp({ regexp: kw, options: 'i' }) }
    ])
  }

  if (event.isbn) {
    query = query.where({ isbn: db.RegExp({ regexp: event.isbn, options: 'i' }) })
  }

  if (event.author) {
    query = query.where({ author: db.RegExp({ regexp: event.author, options: 'i' }) })
  }

  const page = event.page || 1
  const pageSize = event.pageSize || 10
  const offset = (page - 1) * pageSize

  const [countRes, listRes] = await Promise.all([
    query.count(),
    query.skip(offset).limit(pageSize).get()
  ])

  return successResponse({
    list: listRes.data,
    total: countRes.total,
    page,
    pageSize
  })
}

async function getBookDetail(event: { bookId: string; useDb?: boolean }) {
  if (event.useDb) {
    return await getBookDetailFromDb(event)
  }

  const book = mockBooks.find((b) => b.bookId === event.bookId)
  if (!book) {
    return errorResponse(404, '图书不存在')
  }
  return successResponse(book)
}

async function getBookDetailFromDb(event: { bookId: string }) {
  const collection = db.collection('books')
  const res = await collection.where({ bookId: event.bookId }).get()
  
  if (res.data.length === 0) {
    return errorResponse(404, '图书不存在')
  }

  const book = res.data[0]
  
  const holdingCollection = db.collection('opac_holdings')
  const holdingRes = await holdingCollection.where({ recCtrlId: book.recCtrlId }).get()

  return successResponse({
    ...book,
    holdings: holdingRes.data
  })
}

async function checkBookStatus(event: { bookId: string; useDb?: boolean }) {
  if (event.useDb) {
    return await checkBookStatusFromDb(event)
  }

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

async function checkBookStatusFromDb(event: { bookId: string }) {
  const collection = db.collection('books')
  const res = await collection.where({ bookId: event.bookId }).get()
  
  if (res.data.length === 0) {
    return errorResponse(404, '图书不存在')
  }

  const book = res.data[0]
  const availableCount = book.availableCount || 0
  const holdingsCount = book.holdingsCount || 0

  let reservationType = 'BORROWING'
  let estimatedTime = '立即可取'
  let position = 1

  if (availableCount > 0) {
    reservationType = 'DIRECT_BORROW'
    estimatedTime = '立即可取'
    position = 0
  } else if (holdingsCount > 0) {
    reservationType = 'WAITING'
    estimatedTime = '约1-3个工作日'
    position = await getWaitingPosition(book.isbn)
  } else {
    reservationType = 'UNAVAILABLE'
    estimatedTime = '暂无可借副本'
    position = -1
  }

  return successResponse({
    status: book.status,
    reservationType,
    estimatedTime,
    position
  })
}

async function getWaitingPosition(isbn: string): Promise<number> {
  const collection = db.collection('reservations')
  const res = await collection
    .where({ isbn, status: 'PENDING' })
    .count()
  
  return res.total + 1
}

async function createReservation(event: { bookId: string; bookName: string; isbn: string; campus: string; pickupLocation: string; useDb?: boolean }) {
  if (event.useDb) {
    return await createReservationInDb(event)
  }

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

async function createReservationInDb(event: { bookId: string; bookName: string; isbn: string; campus: string; pickupLocation: string }) {
  const bookCollection = db.collection('books')
  const bookRes = await bookCollection.where({ bookId: event.bookId }).get()
  
  if (bookRes.data.length === 0) {
    return errorResponse(404, '图书不存在')
  }

  const book = bookRes.data[0]
  const availableCount = book.availableCount || 0

  let reservationType = 'BORROWING'
  let estimatedTime = '立即可取'
  let position = 0

  if (availableCount > 0) {
    reservationType = 'DIRECT_BORROW'
  } else {
    reservationType = 'WAITING'
    estimatedTime = '约1-3个工作日'
    position = await getWaitingPosition(event.isbn)
  }

  const newReservation = {
    reservationId: `reservation_${Date.now()}`,
    bookId: event.bookId,
    bookName: event.bookName,
    isbn: event.isbn,
    userId: MOCK_LOGIN_OPENID,
    userName: '阅读者',
    userPhone: '13800138000',
    userEmail: 'reader@example.com',
    reservationType,
    campus: event.campus,
    stackType: book.stackType || '',
    status: 'PENDING',
    position,
    estimatedTime,
    pickupLocation: event.pickupLocation,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const collection = db.collection('reservations')
  await collection.add(newReservation)

  return successResponse(newReservation)
}

async function getMyReservations(event: { useDb?: boolean }) {
  if (event.useDb) {
    return await getMyReservationsFromDb(event)
  }

  const userReservations = mockReservations.filter((r) => r.userId === MOCK_LOGIN_OPENID)
  return successResponse({
    list: userReservations,
    total: userReservations.length,
    page: 1,
    pageSize: 100,
  })
}

async function getMyReservationsFromDb(event: {}) {
  const collection = db.collection('reservations')
  const res = await collection.where({ userId: MOCK_LOGIN_OPENID }).orderBy('createdAt', 'desc').get()

  return successResponse({
    list: res.data,
    total: res.data.length,
    page: 1,
    pageSize: 100
  })
}

async function getReservationDetail(event: { reservationId: string; useDb?: boolean }) {
  if (event.useDb) {
    return await getReservationDetailFromDb(event)
  }

  const reservation = mockReservations.find((r) => r.reservationId === event.reservationId)
  if (!reservation) {
    return errorResponse(404, '预约不存在')
  }
  return successResponse(reservation)
}

async function getReservationDetailFromDb(event: { reservationId: string }) {
  const collection = db.collection('reservations')
  const res = await collection.where({ reservationId: event.reservationId }).get()

  if (res.data.length === 0) {
    return errorResponse(404, '预约不存在')
  }

  return successResponse(res.data[0])
}

async function cancelReservation(event: { reservationId: string; useDb?: boolean }) {
  if (event.useDb) {
    return await cancelReservationInDb(event)
  }

  const index = mockReservations.findIndex((r) => r.reservationId === event.reservationId)
  if (index === -1) {
    return errorResponse(404, '预约不存在')
  }
  
  mockReservations[index].status = 'CANCELLED'
  mockReservations[index].updatedAt = Date.now()
  
  return successResponse('取消成功')
}

async function cancelReservationInDb(event: { reservationId: string }) {
  const collection = db.collection('reservations')
  const res = await collection.where({ reservationId: event.reservationId }).get()

  if (res.data.length === 0) {
    return errorResponse(404, '预约不存在')
  }

  await collection.where({ reservationId: event.reservationId }).update({
    status: 'CANCELLED',
    updatedAt: Date.now()
  })

  return successResponse('取消成功')
}

async function getAllReservations(event: { type?: string; status?: string; page?: number; pageSize?: number; useDb?: boolean }) {
  if (event.useDb) {
    return await getAllReservationsFromDb(event)
  }

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

async function getAllReservationsFromDb(event: { type?: string; status?: string; page?: number; pageSize?: number }) {
  const collection = db.collection('reservations')
  let query = collection

  if (event.type) {
    query = query.where({ reservationType: event.type })
  }

  if (event.status) {
    query = query.where({ status: event.status })
  }

  const page = event.page || 1
  const pageSize = event.pageSize || 10
  const offset = (page - 1) * pageSize

  const [countRes, listRes] = await Promise.all([
    query.count(),
    query.skip(offset).limit(pageSize).orderBy('createdAt', 'desc').get()
  ])

  return successResponse({
    list: listRes.data,
    total: countRes.total,
    page,
    pageSize
  })
}

async function confirmReservation(event: { reservationId: string; useDb?: boolean }) {
  if (event.useDb) {
    return await confirmReservationInDb(event)
  }

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

async function confirmReservationInDb(event: { reservationId: string }) {
  const collection = db.collection('reservations')
  const res = await collection.where({ reservationId: event.reservationId }).get()

  if (res.data.length === 0) {
    return errorResponse(404, '预约不存在')
  }

  const reservation = res.data[0]
  if (reservation.status !== 'PENDING') {
    return errorResponse(400, '只能确认待处理的预约')
  }

  await collection.where({ reservationId: event.reservationId }).update({
    status: 'CONFIRMED',
    updatedAt: Date.now()
  })

  return successResponse('确认成功')
}

async function rejectReservation(event: { reservationId: string; reason: string; useDb?: boolean }) {
  if (event.useDb) {
    return await rejectReservationInDb(event)
  }

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

async function rejectReservationInDb(event: { reservationId: string; reason: string }) {
  const collection = db.collection('reservations')
  const res = await collection.where({ reservationId: event.reservationId }).get()

  if (res.data.length === 0) {
    return errorResponse(404, '预约不存在')
  }

  const reservation = res.data[0]
  if (reservation.status === 'COMPLETED' || reservation.status === 'CANCELLED') {
    return errorResponse(400, '无法拒绝已完成或已取消的预约')
  }

  await collection.where({ reservationId: event.reservationId }).update({
    status: 'REJECTED',
    updatedAt: Date.now(),
    rejectReason: event.reason
  })

  return successResponse('拒绝成功')
}

async function completeReservation(event: { reservationId: string; useDb?: boolean }) {
  if (event.useDb) {
    return await completeReservationInDb(event)
  }

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

async function completeReservationInDb(event: { reservationId: string }) {
  const collection = db.collection('reservations')
  const res = await collection.where({ reservationId: event.reservationId }).get()

  if (res.data.length === 0) {
    return errorResponse(404, '预约不存在')
  }

  const reservation = res.data[0]
  if (reservation.status !== 'PROCESSING') {
    return errorResponse(400, '只能完成处理中的预约')
  }

  await collection.where({ reservationId: event.reservationId }).update({
    status: 'COMPLETED',
    updatedAt: Date.now()
  })

  return successResponse('完成成功')
}

async function getDatabaseBooks(event: {}) {
  const collection = db.collection('books')
  const res = await collection.get()
  return successResponse({
    list: res.data,
    total: res.data.length
  })
}
