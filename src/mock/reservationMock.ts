/**
 * @file 预约系统 Mock 数据
 */

import type { Book, Reservation } from '../types/reservation'
import { MOCK_LOGIN_OPENID } from './seedData'

export const mockBooks: Book[] = [
  {
    bookId: 'res_book_001',
    title: '红楼梦',
    author: '曹雪芹',
    isbn: '9787020002207',
    publisher: '人民文学出版社',
    callNumber: 'I242.47/1',
    stackType: 'CENTER',
    campus: 'campus_001',
    status: 'BORROWED',
    inventory: 3,
    availableCount: 0,
    cover: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=Chinese%20classic%20novel%20Dream%20of%20Red%20Chamber%20book%20cover%20elegant%20style&image_size=portrait_4_3',
  },
  {
    bookId: 'res_book_002',
    title: '三国演义',
    author: '罗贯中',
    isbn: '9787020008728',
    publisher: '人民文学出版社',
    callNumber: 'I242.47/2',
    stackType: 'NORMAL',
    campus: 'campus_001',
    status: 'AVAILABLE',
    inventory: 5,
    availableCount: 2,
    cover: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=Chinese%20classic%20novel%20Romance%20of%20Three%20Kingdoms%20book%20cover&image_size=portrait_4_3',
  },
  {
    bookId: 'res_book_003',
    title: '西游记',
    author: '吴承恩',
    isbn: '9787020008735',
    publisher: '人民文学出版社',
    callNumber: 'I242.47/3',
    stackType: 'NEW',
    campus: 'campus_002',
    status: 'AVAILABLE',
    inventory: 2,
    availableCount: 2,
    cover: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=Chinese%20classic%20novel%20Journey%20to%20the%20West%20book%20cover%20Monkey%20King&image_size=portrait_4_3',
  },
  {
    bookId: 'res_book_004',
    title: '水浒传',
    author: '施耐庵',
    isbn: '9787020008742',
    publisher: '人民文学出版社',
    callNumber: 'I242.47/4',
    stackType: 'NORMAL',
    campus: 'campus_001',
    status: 'BORROWED',
    inventory: 4,
    availableCount: 0,
    cover: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=Chinese%20classic%20novel%20Water%20Margin%20book%20cover%20warriors&image_size=portrait_4_3',
  },
  {
    bookId: 'res_book_005',
    title: '围城',
    author: '钱钟书',
    isbn: '9787020002214',
    publisher: '人民文学出版社',
    callNumber: 'I246.5/1',
    stackType: 'NORMAL',
    campus: 'campus_003',
    status: 'AVAILABLE',
    inventory: 3,
    availableCount: 1,
    cover: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=Modern%20Chinese%20literature%20book%20cover%20elegant%20minimalist&image_size=portrait_4_3',
  },
  {
    bookId: 'res_book_006',
    title: '平凡的世界',
    author: '路遥',
    isbn: '9787020022473',
    publisher: '人民文学出版社',
    callNumber: 'I247.5/1',
    stackType: 'CENTER',
    campus: 'campus_001',
    status: 'RESERVED',
    inventory: 2,
    availableCount: 0,
    cover: 'https://neeko-copilot.bytedance.net/api/text_to_image?prompt=Chinese%20rural%20life%20novel%20book%20cover%20countryside&image_size=portrait_4_3',
  },
]

export const mockReservations: Reservation[] = [
  {
    reservationId: 'reservation_001',
    bookId: 'res_book_001',
    bookName: '红楼梦',
    isbn: '9787020002207',
    userId: MOCK_LOGIN_OPENID,
    userName: '阅读者',
    userPhone: '13800138000',
    userEmail: 'reader@example.com',
    reservationType: 'SPECIAL_STACK',
    campus: 'campus_001',
    stackType: 'CENTER',
    status: 'PROCESSING',
    position: 1,
    estimatedTime: '预计3个工作日内处理',
    pickupLocation: '图书馆一楼借书处',
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 3600000,
  },
  {
    reservationId: 'reservation_002',
    bookId: 'res_book_004',
    bookName: '水浒传',
    isbn: '9787020008742',
    userId: MOCK_LOGIN_OPENID,
    userName: '阅读者',
    userPhone: '13800138000',
    userEmail: 'reader@example.com',
    reservationType: 'BORROWING',
    campus: 'campus_001',
    status: 'PENDING',
    position: 2,
    estimatedTime: '预计7个工作日内处理',
    pickupLocation: '图书馆一楼借书处',
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
  },
]

export function getReservationType(book: Book): { type: string; estimatedTime: string; position: number } {
  if (book.stackType === 'CENTER' || book.stackType === 'NEW') {
    return {
      type: 'SPECIAL_STACK',
      estimatedTime: '预计3个工作日内处理（馆员代借）',
      position: 1,
    }
  }

  if (book.availableCount > 0) {
    return {
      type: 'DIRECT_BORROW',
      estimatedTime: '可直接借阅',
      position: 0,
    }
  }

  const otherCampusBook = mockBooks.find(
    (b) => b.isbn === book.isbn && b.campus !== book.campus && b.availableCount > 0
  )

  if (otherCampusBook) {
    return {
      type: 'CROSS_CAMPUS',
      estimatedTime: `预计5个工作日内从${otherCampusBook.campus === 'campus_002' ? '西校区' : otherCampusBook.campus === 'campus_003' ? '东校区' : '校本部'}调书`,
      position: 1,
    }
  }

  return {
    type: 'BORROWING',
    estimatedTime: '预计7个工作日内处理',
    position: Math.floor(Math.random() * 5) + 1,
  }
}
