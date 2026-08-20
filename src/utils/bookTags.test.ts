import { validateBookTags } from './bookTags'

describe('book tag validation', () => {
  test('allows zero, one and two tags and normalizes whitespace', () => {
    expect(validateBookTags([])).toEqual({ valid: true, tags: [] })
    expect(validateBookTags([' 经典 '])).toEqual({ valid: true, tags: ['经典'] })
    expect(validateBookTags([' 经典 ', '现代'])).toEqual({ valid: true, tags: ['经典', '现代'] })
  })

  test('ignores empty tags and removes duplicates', () => {
    expect(validateBookTags(['', '  ', '重点', '重点'])).toEqual({ valid: true, tags: ['重点'] })
  })

  test('rejects a third tag and an overlong tag', () => {
    expect(validateBookTags(['一', '二', '三'])).toMatchObject({ valid: false })
    expect(validateBookTags(['a'.repeat(21)])).toMatchObject({ valid: false })
  })
})
