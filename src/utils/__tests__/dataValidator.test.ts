import { validateBook, validateReservation, validateBooks, compareData } from '../dataValidator'
import type { Book, Reservation } from '../../types/reservation'

describe('数据校验工具', () => {
  describe('validateBook', () => {
    it('应该通过有效的图书数据', () => {
      const validBook: Book = {
        bookId: 'book_001',
        title: '测试图书',
        author: '测试作者',
        isbn: '9787020000001',
        publisher: '测试出版社',
        callNumber: 'I123.45/6',
        stackType: 'NORMAL',
        campus: 'shahe',
        status: 'AVAILABLE',
        inventory: 5,
        availableCount: 3
      }

      const result = validateBook(validBook)

      expect(result.isValid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('应该检测无效的ISBN', () => {
      const invalidBook = {
        bookId: 'book_001',
        title: '测试图书',
        author: '测试作者',
        isbn: 'invalid-isbn',
        publisher: '测试出版社',
        callNumber: 'I123.45/6',
        stackType: 'NORMAL',
        campus: 'shahe',
        status: 'AVAILABLE',
        inventory: 5,
        availableCount: 3
      }

      const result = validateBook(invalidBook)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'isbn')).toBe(true)
    })

    it('应该检测无效的校区', () => {
      const invalidBook = {
        bookId: 'book_001',
        title: '测试图书',
        author: '测试作者',
        isbn: '9787020000001',
        publisher: '测试出版社',
        callNumber: 'I123.45/6',
        stackType: 'NORMAL',
        campus: 'invalid_campus',
        status: 'AVAILABLE',
        inventory: 5,
        availableCount: 3
      }

      const result = validateBook(invalidBook)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'campus')).toBe(true)
    })

    it('应该检测可借数量大于库存的情况', () => {
      const invalidBook = {
        bookId: 'book_001',
        title: '测试图书',
        author: '测试作者',
        isbn: '9787020000001',
        publisher: '测试出版社',
        callNumber: 'I123.45/6',
        stackType: 'NORMAL',
        campus: 'shahe',
        status: 'AVAILABLE',
        inventory: 3,
        availableCount: 5
      }

      const result = validateBook(invalidBook)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'availableCount')).toBe(true)
    })
  })

  describe('validateReservation', () => {
    it('应该通过有效的预约数据', () => {
      const validReservation: Reservation = {
        reservationId: 'res_001',
        bookId: 'book_001',
        bookName: '测试图书',
        isbn: '9787020000001',
        userId: 'user_001',
        userName: '测试用户',
        userPhone: '13800138000',
        reservationType: 'BORROWING',
        campus: 'shahe',
        status: 'PENDING',
        position: 1,
        pickupLocation: '沙河校区图书馆',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const result = validateReservation(validReservation)

      expect(result.isValid).toBe(true)
      expect(result.errors.length).toBe(0)
    })

    it('应该检测无效的手机号', () => {
      const invalidReservation = {
        reservationId: 'res_001',
        bookId: 'book_001',
        bookName: '测试图书',
        isbn: '9787020000001',
        userId: 'user_001',
        userName: '测试用户',
        userPhone: 'invalid-phone',
        reservationType: 'BORROWING',
        campus: 'shahe',
        status: 'PENDING',
        position: 1,
        pickupLocation: '沙河校区图书馆',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      const result = validateReservation(invalidReservation)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'userPhone')).toBe(true)
    })

    it('应该检测updatedAt小于createdAt的情况', () => {
      const now = Date.now()
      const invalidReservation = {
        reservationId: 'res_001',
        bookId: 'book_001',
        bookName: '测试图书',
        isbn: '9787020000001',
        userId: 'user_001',
        userName: '测试用户',
        userPhone: '13800138000',
        reservationType: 'BORROWING',
        campus: 'shahe',
        status: 'PENDING',
        position: 1,
        pickupLocation: '沙河校区图书馆',
        createdAt: now,
        updatedAt: now - 1000
      }

      const result = validateReservation(invalidReservation)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.field === 'updatedAt')).toBe(true)
    })
  })

  describe('validateBooks', () => {
    it('应该正确总结多本图书的校验结果', () => {
      const books: Book[] = [
        {
          bookId: 'book_001',
          title: '有效图书',
          author: '测试作者',
          isbn: '9787020000001',
          publisher: '测试出版社',
          callNumber: 'I123.45/6',
          stackType: 'NORMAL',
          campus: 'shahe',
          status: 'AVAILABLE',
          inventory: 5,
          availableCount: 3
        },
        {
          bookId: 'book_002',
          title: '无效图书',
          author: '测试作者',
          isbn: 'invalid-isbn',
          publisher: '测试出版社',
          callNumber: 'I123.45/7',
          stackType: 'NORMAL',
          campus: 'invalid',
          status: 'AVAILABLE',
          inventory: 3,
          availableCount: 5
        }
      ]

      const { summary } = validateBooks(books)

      expect(summary.total).toBe(2)
      expect(summary.valid).toBe(1)
      expect(summary.invalid).toBe(1)
      expect(summary.errorCount).toBeGreaterThan(0)
    })
  })

  describe('compareData', () => {
    it('应该正确比较两个对象的字段', () => {
      const source = {
        title: '原书名',
        author: '原作者',
        isbn: '9787020000001',
        inventory: 5
      }

      const target = {
        title: '新书名',
        author: '原作者',
        isbn: '9787020000001',
        availableCount: 3
      }

      const fields = ['title', 'author', 'isbn', 'inventory', 'availableCount']

      const results = compareData(source, target, fields)

      expect(results.find(r => r.field === 'title')?.areEqual).toBe(false)
      expect(results.find(r => r.field === 'author')?.areEqual).toBe(true)
      expect(results.find(r => r.field === 'isbn')?.areEqual).toBe(true)
      expect(results.find(r => r.field === 'inventory')?.difference).toBe('missing')
      expect(results.find(r => r.field === 'availableCount')?.difference).toBe('extra')
    })
  })
})