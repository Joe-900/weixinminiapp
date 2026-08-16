/**
 * @file 图书馆元数据文件解析与预览的单测（纯逻辑，不依赖小程序运行时）
 */

import {
  computeImportPreview,
  parseCsv,
  parseLibraryRowsFromExcel,
  parseLibraryRowsFromText,
} from './libraryImport'
import type { BuptLibraryBookRow } from './buptSourceAdapter'

describe('parseCsv', () => {
  it('解析表头与带引号字段（引号内逗号、双引号转义）', () => {
    const text = [
      'title,authors,isbn_issn,holdings_count',
      '"三体, 全集",刘慈欣,978-7-5366-9293-0,3',
      '朝闻道,刘慈欣,,0',
      '"说""破""",无名,,',
    ].join('\r\n')
    const rows = parseCsv(text)
    expect(rows).toHaveLength(3)
    expect(rows[0].title).toBe('三体, 全集')
    expect(rows[0].authors).toBe('刘慈欣')
    expect(rows[0].holdings_count).toBe('3')
    expect(rows[1].isbn_issn).toBe('')
    expect(rows[2].title).toBe('说"破"')
  })

  it('忽略空行与 BOM', () => {
    const rows = parseCsv('\uFEFFtitle\na\n\nb\n')
    expect(rows).toHaveLength(2)
    expect(rows[1].title).toBe('b')
  })
})

describe('parseLibraryRowsFromText', () => {
  it('解析 JSON 数组并标准化 BUPT 键名（含中文表头）', () => {
    const rows = parseLibraryRowsFromText(
      'books.json',
      JSON.stringify([
        { title: '朝闻道', authors: '刘慈欣', 'ISBN_ISSN': 'X-1' },
        { 书名: '球状闪电', 作者: '刘慈欣', 馆藏数量: 5, 可借数量: 2 },
      ]),
    )
    expect(rows).toHaveLength(2)
    expect(rows[0].isbn_issn).toBe('X-1')
    expect(rows[1].title).toBe('球状闪电')
    expect(rows[1].holdings_count).toBe(5)
  })

  it('解析 CSV 并标准化键名', () => {
    const rows = parseLibraryRowsFromText('books.csv', 'title,authors\n朝闻道,刘慈欣\n')
    expect(rows).toHaveLength(1)
    expect(rows[0].authors).toBe('刘慈欣')
  })

  it('非数组 JSON 报错、未知后缀报错', () => {
    expect(() => parseLibraryRowsFromText('a.json', '{"title":"x"}')).toThrow('必须是数组')
    expect(() => parseLibraryRowsFromText('a.txt', 'x')).toThrow('仅支持')
  })
})

describe('parseLibraryRowsFromExcel', () => {
  it('解析 xlsx 二进制（node 环境下生成真实文件字节）', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const XLSX = require('xlsx')
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet([
      { title: '朝闻道', authors: '刘慈欣', isbn_issn: 'X1', holdings_count: 4 },
      { title: '球状闪电', authors: '刘慈欣', isbn_issn: 'X2' },
    ])
    XLSX.utils.book_append_sheet(wb, ws, 'books')
    const buffer = XLSX.write(wb, { type: 'array' }) as ArrayBuffer
    const rows = parseLibraryRowsFromExcel(buffer)
    expect(rows).toHaveLength(2)
    expect(rows[0].title).toBe('朝闻道')
    expect(rows[0].holdings_count).toBe(4)
  })
})

describe('computeImportPreview', () => {
  it('统计缺书名与文件内 ISBN 重复', () => {
    const rows: BuptLibraryBookRow[] = [
      { title: 'A', authors: 'a', isbn_issn: '111-1' },
      { title: 'B', authors: 'b', isbn_issn: '1111' },
      { authors: '无名' },
    ]
    const preview = computeImportPreview(rows)
    expect(preview.rawCount).toBe(3)
    expect(preview.missingTitleCount).toBe(1)
    expect(preview.valid).toHaveLength(2)
    // '111-1' 与 '1111' 去符号后相同，两条记录都作为重复提示展示
    expect(preview.duplicateIsbns).toEqual(['111-1', '1111'])
  })

  it('超过 500 条时给出上限提示', () => {
    const rows: BuptLibraryBookRow[] = Array.from({ length: 501 }, (_, i) => ({
      title: `书${i}`,
      isbn_issn: `ISBN-${i}`,
    }))
    const preview = computeImportPreview(rows)
    expect(preview.valid).toHaveLength(501)
    expect(preview.exceedsLimit).toBe(true)
  })

  it('数字书名不会导致解析崩溃，且仍判定为有效', () => {
    const rows = parseLibraryRowsFromText('a.json', JSON.stringify([{ title: 42, authors: 'x' }]))
    const preview = computeImportPreview(rows)
    expect(preview.missingTitleCount).toBe(0)
    expect(preview.valid).toHaveLength(1)
    expect(preview.valid[0].title).toBe('42')
  })
})
