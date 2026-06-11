/**
 * @file 数据一致性校验工具
 */

import type { Book, Reservation } from '../types/reservation'

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  field: string
  message: string
  value?: unknown
  expected?: unknown
}

export interface ValidationWarning {
  field: string
  message: string
  value?: unknown
}

export interface ValidationRule {
  field: string
  validate: (value: unknown, data: Record<string, unknown>) => { isValid: boolean; message: string }
  required?: boolean
}

const bookValidationRules: ValidationRule[] = [
  {
    field: 'bookId',
    validate: (v) => ({
      isValid: typeof v === 'string' && v.length > 0,
      message: 'bookId必须是非空字符串'
    }),
    required: true
  },
  {
    field: 'title',
    validate: (v) => ({
      isValid: typeof v === 'string' && v.length > 0,
      message: 'title必须是非空字符串'
    }),
    required: true
  },
  {
    field: 'author',
    validate: (v) => ({
      isValid: typeof v === 'string' && v.length > 0,
      message: 'author必须是非空字符串'
    }),
    required: true
  },
  {
    field: 'isbn',
    validate: (v) => {
      const isbn = String(v || '')
      const isValid = /^(97(8|9))?\d{9}(\d|X)$/i.test(isbn)
      return {
        isValid,
        message: isValid ? '' : 'ISBN格式不正确'
      }
    },
    required: true
  },
  {
    field: 'publisher',
    validate: (v) => ({
      isValid: typeof v === 'string',
      message: 'publisher必须是字符串'
    })
  },
  {
    field: 'inventory',
    validate: (v) => ({
      isValid: typeof v === 'number' && v >= 0,
      message: 'inventory必须是非负数字'
    }),
    required: true
  },
  {
    field: 'availableCount',
    validate: (v, data) => {
      const inventory = data.inventory as number
      const available = Number(v)
      const isValid = typeof v === 'number' && v >= 0 && available <= inventory
      return {
        isValid,
        message: isValid ? '' : `availableCount必须是非负数字且不大于库存(${inventory})`
      }
    },
    required: true
  },
  {
    field: 'campus',
    validate: (v) => ({
      isValid: ['shahe', 'xitu'].includes(String(v || '')),
      message: 'campus必须是shahe或xitu'
    }),
    required: true
  },
  {
    field: 'status',
    validate: (v) => ({
      isValid: ['AVAILABLE', 'BORROWED', 'RESERVED'].includes(String(v || '')),
      message: 'status必须是AVAILABLE、BORROWED或RESERVED'
    }),
    required: true
  },
  {
    field: 'stackType',
    validate: (v) => ({
      isValid: ['NORMAL', 'CENTER', 'NEW'].includes(String(v || '')),
      message: 'stackType必须是NORMAL、CENTER或NEW'
    })
  },
  {
    field: 'publishDate',
    validate: (v) => {
      if (v === undefined || v === null) return { isValid: true, message: '' }
      const isValid = /^\d{4}-\d{2}-\d{2}$/.test(String(v))
      return {
        isValid,
        message: isValid ? '' : 'publishDate格式不正确，应为YYYY-MM-DD'
      }
    }
  }
]

const reservationValidationRules: ValidationRule[] = [
  {
    field: 'reservationId',
    validate: (v) => ({
      isValid: typeof v === 'string' && v.length > 0,
      message: 'reservationId必须是非空字符串'
    }),
    required: true
  },
  {
    field: 'bookId',
    validate: (v) => ({
      isValid: typeof v === 'string' && v.length > 0,
      message: 'bookId必须是非空字符串'
    }),
    required: true
  },
  {
    field: 'bookName',
    validate: (v) => ({
      isValid: typeof v === 'string' && v.length > 0,
      message: 'bookName必须是非空字符串'
    }),
    required: true
  },
  {
    field: 'isbn',
    validate: (v) => {
      const isbn = String(v || '')
      const isValid = /^(97(8|9))?\d{9}(\d|X)$/i.test(isbn)
      return {
        isValid,
        message: isValid ? '' : 'ISBN格式不正确'
      }
    },
    required: true
  },
  {
    field: 'userId',
    validate: (v) => ({
      isValid: typeof v === 'string' && v.length > 0,
      message: 'userId必须是非空字符串'
    }),
    required: true
  },
  {
    field: 'userName',
    validate: (v) => ({
      isValid: typeof v === 'string' && v.length > 0,
      message: 'userName必须是非空字符串'
    }),
    required: true
  },
  {
    field: 'userPhone',
    validate: (v) => {
      const phone = String(v || '')
      const isValid = /^1[3-9]\d{9}$/.test(phone)
      return {
        isValid,
        message: isValid ? '' : '手机号格式不正确'
      }
    },
    required: true
  },
  {
    field: 'reservationType',
    validate: (v) => ({
      isValid: ['BORROWING', 'CROSS_CAMPUS', 'SPECIAL_STACK'].includes(String(v || '')),
      message: 'reservationType必须是BORROWING、CROSS_CAMPUS或SPECIAL_STACK'
    }),
    required: true
  },
  {
    field: 'campus',
    validate: (v) => ({
      isValid: ['shahe', 'xitu'].includes(String(v || '')),
      message: 'campus必须是shahe或xitu'
    }),
    required: true
  },
  {
    field: 'status',
    validate: (v) => ({
      isValid: ['PENDING', 'CONFIRMED', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(String(v || '')),
      message: 'status必须是有效的预约状态'
    }),
    required: true
  },
  {
    field: 'position',
    validate: (v) => ({
      isValid: typeof v === 'number' && v >= 0,
      message: 'position必须是非负数字'
    })
  },
  {
    field: 'pickupLocation',
    validate: (v) => ({
      isValid: typeof v === 'string' && v.length > 0,
      message: 'pickupLocation必须是非空字符串'
    }),
    required: true
  },
  {
    field: 'createdAt',
    validate: (v) => ({
      isValid: typeof v === 'number' && v > 0,
      message: 'createdAt必须是正整数时间戳'
    }),
    required: true
  },
  {
    field: 'updatedAt',
    validate: (v, data) => {
      const createdAt = data.createdAt as number
      const updatedAt = Number(v)
      const isValid = typeof v === 'number' && v > 0 && updatedAt >= createdAt
      return {
        isValid,
        message: isValid ? '' : 'updatedAt必须是大于等于createdAt的时间戳'
      }
    },
    required: true
  }
]

export function validateBook(book: Partial<Book>): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  bookValidationRules.forEach((rule) => {
    const value = book[rule.field as keyof Book]
    const result = rule.validate(value, book as Record<string, unknown>)

    if (!result.isValid) {
      errors.push({
        field: rule.field,
        message: result.message,
        value
      })
    } else if (value === undefined && rule.required) {
      errors.push({
        field: rule.field,
        message: `${rule.field}是必填字段`,
        value
      })
    } else if (value === undefined || value === null) {
      warnings.push({
        field: rule.field,
        message: `${rule.field}字段为空`,
        value
      })
    }
  })

  return { isValid: errors.length === 0, errors, warnings }
}

export function validateReservation(reservation: Partial<Reservation>): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  reservationValidationRules.forEach((rule) => {
    const value = reservation[rule.field as keyof Reservation]
    const result = rule.validate(value, reservation as Record<string, unknown>)

    if (!result.isValid) {
      errors.push({
        field: rule.field,
        message: result.message,
        value
      })
    } else if (value === undefined && rule.required) {
      errors.push({
        field: rule.field,
        message: `${rule.field}是必填字段`,
        value
      })
    } else if (value === undefined || value === null) {
      warnings.push({
        field: rule.field,
        message: `${rule.field}字段为空`,
        value
      })
    }
  })

  return { isValid: errors.length === 0, errors, warnings }
}

export function validateBooks(books: Book[]): { results: ValidationResult[]; summary: ValidationSummary } {
  const results = books.map(validateBook)
  const summary = summarizeValidation(results)
  return { results, summary }
}

export function validateReservations(reservations: Reservation[]): { results: ValidationResult[]; summary: ValidationSummary } {
  const results = reservations.map(validateReservation)
  const summary = summarizeValidation(results)
  return { results, summary }
}

export interface ValidationSummary {
  total: number
  valid: number
  invalid: number
  warningCount: number
  errorCount: number
}

function summarizeValidation(results: ValidationResult[]): ValidationSummary {
  const summary: ValidationSummary = {
    total: results.length,
    valid: 0,
    invalid: 0,
    warningCount: 0,
    errorCount: 0
  }

  results.forEach((result) => {
    if (result.isValid) {
      summary.valid++
    } else {
      summary.invalid++
    }
    summary.warningCount += result.warnings.length
    summary.errorCount += result.errors.length
  })

  return summary
}

export function compareData(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  fieldNames: string[]
): ComparisonResult[] {
  const results: ComparisonResult[] = []

  fieldNames.forEach((field) => {
    const sourceValue = source[field]
    const targetValue = target[field]
    const areEqual = JSON.stringify(sourceValue) === JSON.stringify(targetValue)

    results.push({
      field,
      sourceValue,
      targetValue,
      areEqual,
      difference: areEqual ? 'none' : determineDifference(sourceValue, targetValue)
    })
  })

  return results
}

export interface ComparisonResult {
  field: string
  sourceValue: unknown
  targetValue: unknown
  areEqual: boolean
  difference: 'none' | 'value' | 'type' | 'missing' | 'extra'
}

function determineDifference(source: unknown, target: unknown): ComparisonResult['difference'] {
  if (source === undefined && target !== undefined) return 'missing'
  if (source !== undefined && target === undefined) return 'extra'
  if (typeof source !== typeof target) return 'type'
  return 'value'
}

export function generateValidationReport(results: ValidationResult[], dataName: string): string {
  const summary = summarizeValidation(results)
  let report = `=== ${dataName} 数据校验报告 ===\n`
  report += `总记录数: ${summary.total}\n`
  report += `通过: ${summary.valid} (${((summary.valid / summary.total) * 100).toFixed(1)}%)\n`
  report += `失败: ${summary.invalid} (${((summary.invalid / summary.total) * 100).toFixed(1)}%)\n`
  report += `警告数: ${summary.warningCount}\n`
  report += `错误数: ${summary.errorCount}\n\n`

  if (summary.errorCount > 0) {
    report += '--- 错误详情 ---\n'
    results.forEach((result, index) => {
      if (result.errors.length > 0) {
        report += `记录 ${index + 1}:\n`
        result.errors.forEach((error) => {
          report += `  - ${error.field}: ${error.message}\n`
        })
      }
    })
  }

  if (summary.warningCount > 0) {
    report += '\n--- 警告详情 ---\n'
    results.forEach((result, index) => {
      if (result.warnings.length > 0) {
        report += `记录 ${index + 1}:\n`
        result.warnings.forEach((warning) => {
          report += `  - ${warning.field}: ${warning.message}\n`
        })
      }
    })
  }

  return report
}