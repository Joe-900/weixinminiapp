/**
 * @file 工具函数
 * @description 通用工具方法
 */

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

export { MAX_BOOK_TAGS, MAX_BOOK_TAG_LENGTH, validateBookTags } from './bookTags'
