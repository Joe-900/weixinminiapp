import { bookFieldMapping, reservationFieldMapping, transformData, validateMapping } from '../fieldMapping'

describe('字段映射工具', () => {
  describe('bookFieldMapping', () => {
    it('应该包含所有必要的字段映射', () => {
      expect(bookFieldMapping.name).toBe('book')
      expect(bookFieldMapping.fields.length).toBeGreaterThan(0)
      
      const requiredFields = ['recCtrlId', 'title', 'authors', 'isbnIssn', 'publisher']
      requiredFields.forEach(field => {
        const mapping = bookFieldMapping.fields.find(f => f.sourceField === field)
        expect(mapping).toBeDefined()
        expect(mapping?.required).toBe(true)
      })
    })
  })

  describe('reservationFieldMapping', () => {
    it('应该包含所有必要的字段映射', () => {
      expect(reservationFieldMapping.name).toBe('reservation')
      expect(reservationFieldMapping.fields.length).toBeGreaterThan(0)
    })
  })

  describe('transformData', () => {
    it('应该正确转换爬虫数据到前端格式', () => {
      const sourceData = {
        recCtrlId: 'book_001',
        title: '测试图书',
        authors: '测试作者',
        isbnIssn: '9787020000001',
        publisher: '测试出版社',
        publishDate: '2023-01-01',
        holdingsCount: 5,
        availableCount: 3,
        materialType: '图书'
      }

      const result = transformData(sourceData, bookFieldMapping)

      expect(result.bookId).toBe('book_001')
      expect(result.title).toBe('测试图书')
      expect(result.author).toBe('测试作者')
      expect(result.isbn).toBe('9787020000001')
      expect(result.publisher).toBe('测试出版社')
      expect(result.publishDate).toBe('2023-01-01')
      expect(result.inventory).toBe(5)
      expect(result.availableCount).toBe(3)
    })

    it('应该应用转换函数', () => {
      const sourceData = {
        holdingsCount: '10',
        availableCount: '5'
      }

      const result = transformData(sourceData, bookFieldMapping)

      expect(result.inventory).toBe(10)
      expect(result.availableCount).toBe(5)
      expect(typeof result.inventory).toBe('number')
    })
  })

  describe('validateMapping', () => {
    it('应该检测缺失的必填字段', () => {
      const sourceData = {
        title: '测试图书'
      }

      const errors = validateMapping(sourceData, bookFieldMapping)

      expect(errors.length).toBeGreaterThan(0)
      expect(errors.some(e => e.includes('recCtrlId'))).toBe(true)
      expect(errors.some(e => e.includes('authors'))).toBe(true)
      expect(errors.some(e => e.includes('isbnIssn'))).toBe(true)
    })

    it('应该通过完整数据的校验', () => {
      const sourceData = {
        recCtrlId: 'book_001',
        title: '测试图书',
        authors: '测试作者',
        isbnIssn: '9787020000001',
        publisher: '测试出版社'
      }

      const errors = validateMapping(sourceData, bookFieldMapping)

      expect(errors.length).toBe(0)
    })
  })
})