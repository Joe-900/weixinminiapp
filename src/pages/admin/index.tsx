/**
 * @file 管理员书籍管理页
 * @description 管理员可新增、编辑、上架/下架书籍，支持状态筛选
 */

import { View, Text, Input, Textarea, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useCallback } from 'react'
import { bookList, bookCreate, bookUpdate, bookOffline, bookOnline } from '../../services/bookService'
import { importLibraryMetadata } from '../../services/libraryService'
import { isSuccess, showErrorToast } from '../../services/request'
import AuthGuard from '../../components/AuthGuard'
import StateView from '../../components/StateView'
import {
  computeImportPreview,
  MAX_IMPORT_COUNT,
  parseLibraryRowsFromExcel,
  parseLibraryRowsFromText,
} from '../../utils/libraryImport'
import type { ImportPreview } from '../../utils/libraryImport'
import type { LibraryImportResult } from '../../types/library'
import type { BuptLibraryBookRow } from '../../utils/buptSourceAdapter'
import type { Book } from '../../types/book'
import { MAX_BOOK_TAG_LENGTH, validateBookTags } from '../../utils/bookTags'
import './index.scss'

type StatusFilter = 'all' | 'online' | 'offline'

const STATUS_LABEL_MAP: Record<StatusFilter, string> = {
  all: '全部',
  online: '已上架',
  offline: '已下架',
}

export default function Admin() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showForm, setShowForm] = useState(false)
  const [editBook, setEditBook] = useState<Book | null>(null)
  const [formTitle, setFormTitle] = useState('')
  const [formAuthor, setFormAuthor] = useState('')
  const [formIsbn, setFormIsbn] = useState('')
  const [formSummary, setFormSummary] = useState('')
  const [formCover, setFormCover] = useState('')
  const [formTagOne, setFormTagOne] = useState('')
  const [formTagTwo, setFormTagTwo] = useState('')
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importResult, setImportResult] = useState<LibraryImportResult | null>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

  const loadBooks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await bookList({ page: 1, pageSize: 100 })
      if (isSuccess(res) && res.data) {
        const filtered = statusFilter === 'all'
          ? res.data.list
          : res.data.list.filter((b) => b.status === statusFilter)
        setBooks(filtered)
      }
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    loadBooks()
  }, [loadBooks])

  function openCreateForm() {
    setEditBook(null)
    setFormTitle('')
    setFormAuthor('')
    setFormIsbn('')
    setFormSummary('')
    setFormCover('')
    setFormTagOne('')
    setFormTagTwo('')
    setShowForm(true)
  }

  function openEditForm(book: Book) {
    setEditBook(book)
    setFormTitle(book.title)
    setFormAuthor(book.author)
    setFormIsbn(book.isbn)
    setFormSummary(book.summary)
    setFormCover(book.cover)
    setFormTagOne(book.tags?.[0] ?? '')
    setFormTagTwo(book.tags?.[1] ?? '')
    setShowForm(true)
  }

  async function handleSubmit() {
    if (!formTitle || !formAuthor || !formIsbn) {
      Taro.showToast({ title: '请填写必填项', icon: 'none' })
      return
    }

    const tagsResult = validateBookTags([formTagOne, formTagTwo])
    if (!tagsResult.valid) {
      Taro.showToast({ title: tagsResult.message, icon: 'none' })
      return
    }

    if (editBook) {
      const res = await bookUpdate({
        bookId: editBook.bookId,
        title: formTitle,
        author: formAuthor,
        isbn: formIsbn,
        summary: formSummary,
        cover: formCover,
        tags: tagsResult.tags,
      })
      if (isSuccess(res)) {
        Taro.showToast({ title: '更新成功', icon: 'success' })
        setShowForm(false)
        loadBooks()
      } else {
        showErrorToast(res.code)
      }
    } else {
      const res = await bookCreate({
        title: formTitle,
        author: formAuthor,
        isbn: formIsbn,
        summary: formSummary,
        cover: formCover || 'local-mock://cover/default.png',
        tags: tagsResult.tags,
      })
      if (isSuccess(res)) {
        Taro.showToast({ title: '创建成功', icon: 'success' })
        setShowForm(false)
        loadBooks()
      } else {
        showErrorToast(res.code)
      }
    }
  }

  async function handleToggleStatus(book: Book) {
    const res = book.status === 'online'
      ? await bookOffline(book.bookId)
      : await bookOnline(book.bookId)

    if (isSuccess(res)) {
      Taro.showToast({ title: '状态已更新', icon: 'success' })
      loadBooks()
    } else {
      showErrorToast(res.code)
    }
  }

  async function handleChooseFile() {
    try {
      const res = await Taro.chooseMessageFile({
        count: 1,
        type: 'file',
        extension: ['xlsx', 'xls', 'json', 'csv'],
      })
      const file = res.tempFiles[0]
      if (!file) return
      const fs = Taro.getFileSystemManager()
      const name = file.name || ''
      const lower = name.toLowerCase()
      let rows: BuptLibraryBookRow[]
      if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        rows = parseLibraryRowsFromExcel(fs.readFileSync(file.path) as ArrayBuffer)
      } else {
        rows = parseLibraryRowsFromText(name, fs.readFileSync(file.path, 'utf8') as string)
      }
      setImportPreview(computeImportPreview(rows))
      setImportResult(null)
      setImportError(rows.length === 0 ? '文件中没有可识别的数据行' : '')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '文件解析失败')
    }
  }

  async function handleImport() {
    if (!importPreview) return
    const items = importPreview.valid
    if (items.length === 0) {
      Taro.showToast({ title: '没有可导入的记录', icon: 'none' })
      return
    }
    setImporting(true)
    try {
      const aggregate: LibraryImportResult = { imported: 0, skipped: 0, bookIds: [], failures: [] }
      for (let start = 0; start < items.length; start += MAX_IMPORT_COUNT) {
        const res = await importLibraryMetadata(items.slice(start, start + MAX_IMPORT_COUNT))
        if (!isSuccess(res) || !res.data) {
          showErrorToast(res.code)
          setImportResult(aggregate.imported > 0 || aggregate.skipped > 0 ? aggregate : null)
          return
        }
        aggregate.imported += res.data.imported
        aggregate.skipped += res.data.skipped
        aggregate.bookIds.push(...res.data.bookIds)
        aggregate.failures.push(...res.data.failures.map((failure) => ({
          ...failure,
          index: failure.index + start,
        })))
        setImportResult({ ...aggregate, bookIds: [...aggregate.bookIds], failures: [...aggregate.failures] })
      }
      Taro.showToast({ title: `导入成功 ${aggregate.imported} 条`, icon: 'success' })
    } finally {
      setImporting(false)
    }
  }

  const normalizedFormTags = [formTagOne.trim(), formTagTwo.trim()]
  const duplicateTag = normalizedFormTags[0] && normalizedFormTags[0] === normalizedFormTags[1]
    ? normalizedFormTags[0]
    : ''
  const overlongTag = [formTagOne, formTagTwo].find((tag) => tag.trim().length > MAX_BOOK_TAG_LENGTH)
  const tagWarning = overlongTag
    ? `标签不能超过 ${MAX_BOOK_TAG_LENGTH} 个字`
    : duplicateTag
      ? `标签“${duplicateTag}”重复，保存时会自动去重`
      : ''

  return (
    <AuthGuard requiredRole='admin'>
      <View className='admin'>
        <View className='admin__header'>
          <Text className='admin__title'>书籍管理</Text>
          <Button className='admin__add-btn' onClick={openCreateForm}>+ 新增书籍</Button>
        </View>

        <View className='admin__filter'>
          {(['all', 'online', 'offline'] as StatusFilter[]).map((s) => (
            <View
              key={s}
              className={`admin__filter-item ${statusFilter === s ? 'admin__filter-item--active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              <Text>{STATUS_LABEL_MAP[s]}</Text>
            </View>
          ))}
        </View>

        <StateView loading={loading} empty={books.length === 0} emptyText='暂无书籍' />

        {books.map((book) => (
          <View key={book.bookId} className='admin__book-item'>
            <View className='admin__book-info'>
              <Text className='admin__book-title'>{book.title}</Text>
              <Text className='admin__book-status'>{book.status === 'online' ? '已上架' : '已下架'}</Text>
              {book.tags && book.tags.length > 0 && <Text className='admin__book-tags'>标签：{book.tags.join('、')}</Text>}
            </View>
            <View className='admin__book-actions'>
              <Button size='mini' onClick={() => openEditForm(book)}>编辑</Button>
              <Button size='mini' onClick={() => handleToggleStatus(book)}>
                {book.status === 'online' ? '下架' : '上架'}
              </Button>
            </View>
          </View>
        ))}

        {showForm && (
          <View className='admin__form'>
            <Text className='admin__form-title'>{editBook ? '编辑书籍' : '新增书籍'}</Text>
            <Input className='admin__input' placeholder='书名' value={formTitle} onInput={(e) => setFormTitle(e.detail.value)} />
            <Input className='admin__input' placeholder='作者' value={formAuthor} onInput={(e) => setFormAuthor(e.detail.value)} />
            <Input className='admin__input' placeholder='ISBN' value={formIsbn} onInput={(e) => setFormIsbn(e.detail.value)} />
            <Textarea className='admin__textarea' placeholder='简介' value={formSummary} onInput={(e) => setFormSummary(e.detail.value)} />
            <Input className='admin__input' placeholder='封面地址或文件ID' value={formCover} onInput={(e) => setFormCover(e.detail.value)} />
            <Input className='admin__input' placeholder='标签一（可选）' maxlength={MAX_BOOK_TAG_LENGTH} value={formTagOne} onInput={(e) => setFormTagOne(e.detail.value)} />
            <Input className='admin__input' placeholder='标签二（可选）' maxlength={MAX_BOOK_TAG_LENGTH} value={formTagTwo} onInput={(e) => setFormTagTwo(e.detail.value)} />
            {tagWarning && <Text className='admin__form-tag-warning'>{tagWarning}</Text>}
            <Text className='admin__form-note'>标签最多 2 个，保存后用于书单展示和筛选，不会自动生成。</Text>
            <View className='admin__form-actions'>
              <Button onClick={handleSubmit}>保存</Button>
              <Button onClick={() => setShowForm(false)}>取消</Button>
            </View>
          </View>
        )}

        <View className='admin__section'>
          <Text className='admin__section-title'>图书馆元数据导入</Text>
          <Text className='admin__section-note'>
            仅导入图书元数据（书名/作者/ISBN/出版社/馆藏等），不导入正文或扫描件，raw_json 不会入库。
          </Text>
          <Button className='admin__file-btn' onClick={handleChooseFile}>选择 Excel / JSON 文件</Button>

          {importError && <View className='admin__import-error'>{importError}</View>}

          {importPreview && (
            <View className='admin__import-panel'>
              <View className='admin__import-stats'>
                总记录 {importPreview.rawCount} 条 · 缺书名 {importPreview.missingTitleCount} 条 · 可导入 {importPreview.valid.length} 条
                {importPreview.exceedsLimit ? `（将按每批 ${MAX_IMPORT_COUNT} 条分批提交）` : ''}
              </View>
              {importPreview.duplicateIsbns.length > 0 && (
                <View className='admin__import-warn'>
                  <Text>ISBN 重复提示：{importPreview.duplicateIsbns.join('、')}</Text>
                </View>
              )}
              <View className='admin__import-list'>
                {importPreview.valid.slice(0, 20).map((item, idx) => (
                  <View key={`${item.isbn ?? ''}-${idx}`} className='admin__import-item'>
                    <View className='admin__import-item-title'>{item.title}</View>
                    <View className='admin__import-item-meta'>
                      {item.author || '—'} · {item.isbn || '无 ISBN'}
                    </View>
                    <View className='admin__import-item-meta'>
                      {item.publisher || '—'} · 馆藏 {item.holdingsCount ?? '—'} / 可借 {item.availableCount ?? '—'}
                    </View>
                    <View className='admin__import-item-meta'>
                      索书号 {item.callNumber || '—'} · 来源 {item.librarySource}
                    </View>
                  </View>
                ))}
                {importPreview.valid.length > 20 && (
                  <Text className='admin__import-more'>…… 共 {importPreview.valid.length} 条</Text>
                )}
              </View>
              <Button
                className='admin__import-btn'
                loading={importing}
                disabled={importing}
                onClick={handleImport}
              >
                批量导入（{importPreview.valid.length} 条）
              </Button>
              {importResult && (
                <View className='admin__import-result'>
                  <Text className='admin__import-result-ok'>
                    成功 {importResult.imported} 条 · 跳过 {importResult.skipped} 条
                  </Text>
                  {importResult.failures.length > 0 && (
                    <View className='admin__import-failures'>
                      {importResult.failures.map((f) => (
                        <Text key={`${f.index}-${f.reason}`} className='admin__import-failure'>
                          第 {f.index + 1} 条：{f.reason}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </AuthGuard>
  )
}
