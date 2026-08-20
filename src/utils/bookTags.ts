export const MAX_BOOK_TAGS = 2
export const MAX_BOOK_TAG_LENGTH = 20

export type BookTagValidation =
  | { valid: true; tags: string[] }
  | { valid: false; message: string }

export function validateBookTags(input: unknown): BookTagValidation {
  if (input === undefined) return { valid: true, tags: [] }
  if (!Array.isArray(input)) return { valid: false, message: '标签必须是数组' }

  const tags: string[] = []
  for (const rawTag of input) {
    if (typeof rawTag !== 'string') return { valid: false, message: '标签必须是文字' }
    const tag = rawTag.trim()
    if (!tag) continue
    if (tag.length > MAX_BOOK_TAG_LENGTH) {
      return { valid: false, message: `单个标签不能超过 ${MAX_BOOK_TAG_LENGTH} 个字` }
    }
    if (!tags.includes(tag)) tags.push(tag)
  }

  if (tags.length > MAX_BOOK_TAGS) {
    return { valid: false, message: `最多只能设置 ${MAX_BOOK_TAGS} 个标签` }
  }
  return { valid: true, tags }
}
