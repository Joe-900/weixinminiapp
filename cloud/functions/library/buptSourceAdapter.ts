import type { LibraryMetadata } from '../../../src/types/library'

/** Column names emitted by yifanchen12/-/bupt_library_crawler/exporter.py. */
export interface BuptLibraryBookRow {
  rec_ctrl_id?: string
  title?: string
  authors?: string
  isbn_issn?: string
  publisher?: string
  publish_date?: string
  classno_abs?: string
  search_no?: string
  subject_terms?: string
  library_name?: string
  holdings_count?: number | string
  available_count?: number | string
  material_type?: string
  detail_url?: string
}

export interface BuptLibraryHoldingRow {
  department?: string
  shelf_status?: string
  location_url?: string
}

function parseCount(value: number | string | undefined): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function mapBuptLibraryRow(
  row: BuptLibraryBookRow,
  holding?: BuptLibraryHoldingRow,
): LibraryMetadata | null {
  const title = row.title?.trim()
  if (!title) return null
  const availableCount = parseCount(row.available_count)
  return {
    title,
    author: row.authors?.trim(),
    isbn: row.isbn_issn?.trim(),
    publishedAt: row.publish_date?.trim(),
    callNumber: row.classno_abs?.trim(),
    subjectTerms: row.subject_terms?.trim(),
    libraryName: row.library_name?.trim(),
    holdingsCount: parseCount(row.holdings_count),
    availableCount,
    materialType: row.material_type?.trim(),
    sourceRecordId: row.rec_ctrl_id?.trim(),
    detailUrl: row.detail_url?.trim(),
    librarySource: 'https://github.com/yifanchen12/-',
    collectionStatus: availableCount === undefined || availableCount > 0 ? 'available' : 'unavailable',
    location: holding?.department?.trim() || holding?.shelf_status?.trim() || holding?.location_url?.trim(),
  }
}

export function mapBuptLibraryRows(rows: BuptLibraryBookRow[]): LibraryMetadata[] {
  return rows.map((row) => mapBuptLibraryRow(row)).filter((item): item is LibraryMetadata => item !== null)
}
