/**
 * @file 图书馆元数据文件解析与导入预览
 * @description 仅处理图书元数据（书名/作者/ISBN/出版社/馆藏等），
 * 不涉及书籍正文、扫描件；平台不会保存 raw_json 或全文。
 */

import type { LibraryMetadata } from '../types/library'
import type { BuptLibraryBookRow } from './buptSourceAdapter'
import { mapBuptLibraryRows } from './buptSourceAdapter'

export interface ImportPreview {
  rawCount: number
  missingTitleCount: number
  /** 通过 BUPT 标准化映射的有效记录（缺书名的已被剔除） */
  valid: LibraryMetadata[]
  /** 文件内部 ISBN 重复的提示列表（展示原文） */
  duplicateIsbns: string[]
  /** 有效记录数是否超过单次导入上限（服务端上限 500 条） */
  exceedsLimit: boolean
}

export const MAX_IMPORT_COUNT = 500

/** 兼容常见表头：标准化键名 -> BUPT 字段名 */
const HEADER_ALIAS_MAP: Record<string, keyof BuptLibraryBookRow> = {
  title: 'title',
  书名: 'title',
  authors: 'authors',
  author: 'authors',
  作者: 'authors',
  isbn_issn: 'isbn_issn',
  isbnissn: 'isbn_issn',
  isbn: 'isbn_issn',
  标准书号: 'isbn_issn',
  publisher: 'publisher',
  出版社: 'publisher',
  publish_date: 'publish_date',
  publishdate: 'publish_date',
  出版日期: 'publish_date',
  classno_abs: 'classno_abs',
  classnoabs: 'classno_abs',
  callnumber: 'classno_abs',
  索书号: 'classno_abs',
  search_no: 'search_no',
  searchno: 'search_no',
  检索号: 'search_no',
  subject_terms: 'subject_terms',
  subjectterms: 'subject_terms',
  主题词: 'subject_terms',
  library_name: 'library_name',
  libraryname: 'library_name',
  馆藏地: 'library_name',
  holdings_count: 'holdings_count',
  holdingscount: 'holdings_count',
  馆藏数量: 'holdings_count',
  available_count: 'available_count',
  availablecount: 'available_count',
  可借数量: 'available_count',
  material_type: 'material_type',
  materialtype: 'material_type',
  资料类型: 'material_type',
  detail_url: 'detail_url',
  detailurl: 'detail_url',
  详情链接: 'detail_url',
  rec_ctrl_id: 'rec_ctrl_id',
  recctrlid: 'rec_ctrl_id',
  记录id: 'rec_ctrl_id',
}

function normalizeHeaderKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '')
}

/** 把任意来源的一行数据映射到 BUPT 字段名（只保留认识的表头） */
export function normalizeRowKeys(row: Record<string, unknown>): BuptLibraryBookRow {
  const out: Record<string, unknown> = {}
  for (const [rawKey, value] of Object.entries(row)) {
    if (value === undefined || value === null) continue
    const target = HEADER_ALIAS_MAP[normalizeHeaderKey(rawKey)]
    if (target) out[target] = typeof value === 'string' ? value.trim() : value
  }
  return out as BuptLibraryBookRow
}

/** 简单 CSV 解析：支持带引号字段（含引号内逗号与双引号转义） */
export function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0)
  if (lines.length === 0) return []

  const cells = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i]
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            current += '"'
            i += 1
          } else {
            inQuotes = false
          }
        } else {
          current += ch
        }
      } else if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        result.push(current)
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current)
    return result.map((c) => c.trim())
  }

  const header = cells(lines[0])
  return lines.slice(1).map((line) => {
    const values = cells(line)
    const row: Record<string, string> = {}
    header.forEach((h, i) => {
      if (h) row[h] = values[i] ?? ''
    })
    return row
  })
}

/** 解析 JSON / CSV 文本文件为 BUPT 行 */
export function parseLibraryRowsFromText(filename: string, text: string): BuptLibraryBookRow[] {
  const lower = filename.toLowerCase()
  if (lower.endsWith('.json')) {
    const parsed: unknown = JSON.parse(text)
    if (!Array.isArray(parsed)) throw new Error('JSON 文件顶层必须是数组')
    return parsed
      .filter((item): item is Record<string, unknown> => !!item && typeof item === 'object')
      .map(normalizeRowKeys)
  }
  if (lower.endsWith('.csv')) {
    return parseCsv(text).map((row) => normalizeRowKeys(row as unknown as Record<string, unknown>))
  }
  throw new Error('仅支持 .xlsx / .xls / .json / .csv 文件')
}

/** xlsx 库最小类型面（避免引入 @types/xlsx） */
interface XlsxApi {
  read(data: ArrayBuffer, opts: { type: 'array' }): { SheetNames: string[]; Sheets: Record<string, unknown> }
  utils: {
    sheet_to_json<T = Record<string, unknown>>(sheet: unknown, opts?: { defval?: unknown }): T[]
  }
}

let xlsxModule: XlsxApi | null | undefined

function loadXlsx(): XlsxApi | null {
  if (xlsxModule !== undefined) return xlsxModule
  try {
    // 惰性加载：xlsx 内部可能引用 node 内置模块，在部分运行时加载失败时降级提示改用 JSON/CSV
    // eslint-disable-next-line @typescript-eslint/no-var-requires, import/no-dynamic-require
    xlsxModule = require('xlsx') as XlsxApi
  } catch {
    xlsxModule = null
  }
  return xlsxModule
}

/** 解析 Excel 文件二进制（ArrayBuffer）为 BUPT 行 */
export function parseLibraryRowsFromExcel(buffer: ArrayBuffer): BuptLibraryBookRow[] {
  const XLSX = loadXlsx()
  if (!XLSX) throw new Error('Excel 解析库不可用，请改用 JSON 或 CSV 文件')
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames.find((name) => name.trim().toLowerCase() === 'all books')
    ?? workbook.SheetNames.find((name) => {
      const firstRow = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[name], { defval: '' })[0]
      return firstRow !== undefined && Object.keys(firstRow).some((key) => normalizeHeaderKey(key) === 'title')
    })
    ?? workbook.SheetNames[0]
  if (!sheetName) return []
  const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })
  return rawRows.map(normalizeRowKeys)
}

/** 把行内非计数字段统一转成字符串，避免 number 值在 trim() 处崩溃 */
function sanitizeBuptRow(row: BuptLibraryBookRow): BuptLibraryBookRow {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (value === undefined || value === null) continue
    if ((key === 'holdings_count' || key === 'available_count') && typeof value === 'number') {
      out[key] = value
    } else {
      out[key] = String(value)
    }
  }
  return out as BuptLibraryBookRow
}

/** 计算导入预览：缺书名、有效记录、ISBN 重复提示 */
export function computeImportPreview(rows: BuptLibraryBookRow[]): ImportPreview {
  const sanitized = rows.map(sanitizeBuptRow)
  const rawCount = sanitized.length
  const missingTitleCount = sanitized.filter((r) => !r.title || !String(r.title).trim()).length
  const valid = mapBuptLibraryRows(sanitized)

  const seen = new Map<string, number>()
  for (const item of valid) {
    if (!item.isbn) continue
    const normalized = item.isbn.replace(/[-\s]/g, '')
    if (!normalized) continue
    seen.set(normalized, (seen.get(normalized) ?? 0) + 1)
  }
  const duplicateIsbns: string[] = []
  for (const item of valid) {
    if (!item.isbn) continue
    const normalized = item.isbn.replace(/[-\s]/g, '')
    if ((seen.get(normalized) ?? 0) > 1 && !duplicateIsbns.includes(item.isbn)) {
      duplicateIsbns.push(item.isbn)
    }
  }

  return {
    rawCount,
    missingTitleCount,
    valid,
    duplicateIsbns,
    exceedsLimit: valid.length > MAX_IMPORT_COUNT,
  }
}
