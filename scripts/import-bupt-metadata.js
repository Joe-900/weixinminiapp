/*
 * Convert a BUPT crawler workbook into metadata-only import batches.
 * The source workbook's Holdings sheet is intentionally never read into the
 * output, so barcodes, raw holding text, and item-level records stay outside
 * the platform dataset.
 */

const fs = require('node:fs')
const path = require('node:path')
const XLSX = require('xlsx')

const SOURCE_URL = 'https://github.com/yifanchen12/-'

function usage() {
  return [
    '用法：node scripts/import-bupt-metadata.js --input <All Books.xlsx> --output-dir <目录> [--batch-size 500] [--limit 数量]',
    '输出：metadata-0001.json ... 以及 manifest.json；文件仅包含 LibraryMetadata 字段。',
  ].join('\n')
}

function option(args, name) {
  const index = args.indexOf(name)
  if (index < 0) return undefined
  const value = args[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${name} 缺少值`)
  return value
}

function positiveInteger(value, name, defaultValue) {
  if (value === undefined) return defaultValue
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${name} 必须是正整数`)
  return parsed
}

function text(value) {
  if (value === undefined || value === null) return undefined
  const trimmed = String(value).trim()
  return trimmed || undefined
}

function count(value) {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeHeader(key) {
  return String(key).trim().toLowerCase().replace(/\s+/g, '_')
}

function selectBooksSheet(workbook) {
  const exact = workbook.SheetNames.find((name) => normalizeHeader(name) === 'all_books')
  if (exact) return exact
  const detected = workbook.SheetNames.find((name) => {
    const firstRow = XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '' })[0]
    return firstRow && Object.keys(firstRow).some((key) => normalizeHeader(key) === 'title')
  })
  if (!detected) throw new Error('工作簿中没有可识别的书目工作表（需要 All Books 或 title 列）')
  return detected
}

function mapRow(row) {
  const title = text(row.title)
  if (!title) return null
  const availableCount = count(row.available_count)
  return {
    title,
    author: text(row.authors),
    isbn: text(row.isbn_issn),
    publisher: text(row.publisher),
    publishedAt: text(row.publish_date),
    callNumber: text(row.classno_abs),
    subjectTerms: text(row.subject_terms),
    libraryName: text(row.library_name),
    holdingsCount: count(row.holdings_count),
    availableCount,
    materialType: text(row.material_type),
    sourceRecordId: text(row.rec_ctrl_id),
    detailUrl: text(row.detail_url),
    librarySource: SOURCE_URL,
    collectionStatus: availableCount === undefined || availableCount > 0 ? 'available' : 'unavailable',
  }
}

function writeBatches(items, outputDir, batchSize, inputFile) {
  fs.mkdirSync(outputDir, { recursive: true })
  const batches = []
  for (let start = 0; start < items.length; start += batchSize) {
    const batch = items.slice(start, start + batchSize)
    const filename = `metadata-${String(batches.length + 1).padStart(4, '0')}.json`
    fs.writeFileSync(path.join(outputDir, filename), `${JSON.stringify(batch, null, 2)}\n`, 'utf8')
    batches.push({ filename, count: batch.length })
  }
  const manifest = {
    source: SOURCE_URL,
    inputFile: path.basename(inputFile),
    generatedAt: new Date().toISOString(),
    total: items.length,
    batchSize,
    batches,
    excludedSheets: ['Holdings'],
    excludedFields: ['barcode', 'register_no', 'circulation_status', 'shelf_status', 'location_url', 'raw_text'],
  }
  fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return manifest
}

function main(argv) {
  const input = option(argv, '--input')
  const outputDir = option(argv, '--output-dir')
  if (!input || !outputDir) throw new Error(`${usage()}\n`)
  const batchSize = positiveInteger(option(argv, '--batch-size'), '--batch-size', 500)
  const limit = positiveInteger(option(argv, '--limit'), '--limit', Number.MAX_SAFE_INTEGER)
  const inputPath = path.resolve(input)
  const outputPath = path.resolve(outputDir)
  if (!fs.existsSync(inputPath)) throw new Error(`找不到输入文件：${inputPath}`)

  const workbook = XLSX.readFile(inputPath, { cellDates: false })
  const sheetName = selectBooksSheet(workbook)
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' })
  const items = []
  let skippedMissingTitle = 0
  for (const row of rows) {
    const mapped = mapRow(row)
    if (!mapped) {
      skippedMissingTitle += 1
      continue
    }
    items.push(mapped)
    if (items.length >= limit) break
  }
  const manifest = writeBatches(items, outputPath, batchSize, inputPath)
  manifest.sheet = sheetName
  manifest.rawRows = rows.length
  manifest.skippedMissingTitle = skippedMissingTitle
  fs.writeFileSync(path.join(outputPath, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  console.log(`已生成 ${manifest.batches.length} 个批次，共 ${manifest.total} 条元数据：${outputPath}`)
}

if (require.main === module) {
  try {
    main(process.argv.slice(2))
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}

module.exports = { mapRow, selectBooksSheet, writeBatches }
