/**
 * @file 管理员书籍管理页
 * @description 管理员可新增、编辑、上架/下架书籍，支持状态筛选
 */

import { View, Text, Input, Textarea, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useCallback } from 'react'
import { bookList, bookCreate, bookUpdate, bookOffline, bookOnline } from '../../services/bookService'
import { isSuccess, showErrorToast } from '../../services/request'
import { useUserStore } from '../../store/userStore'
import AuthGuard from '../../components/AuthGuard'
import StateView from '../../components/StateView'
import type { Book } from '../../types/book'
import './index.scss'

type StatusFilter = 'all' | 'online' | 'offline'

const STATUS_LABEL_MAP: Record<StatusFilter, string> = {
  all: '全部',
  online: '已上架',
  offline: '已下架',
}

export default function Admin() {
  const role = useUserStore((s) => s.role)
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

  const loadBooks = useCallback(async () => {
    setLoading(true)
    try {
      const statusParam = statusFilter === 'all' ? undefined : statusFilter
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
    setShowForm(true)
  }

  function openEditForm(book: Book) {
    setEditBook(book)
    setFormTitle(book.title)
    setFormAuthor(book.author)
    setFormIsbn(book.isbn)
    setFormSummary(book.summary)
    setFormCover(book.cover)
    setShowForm(true)
  }

  async function handleSubmit() {
    if (!formTitle || !formAuthor || !formIsbn) {
      Taro.showToast({ title: '请填写必填项', icon: 'none' })
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
            <View className='admin__form-actions'>
              <Button onClick={handleSubmit}>保存</Button>
              <Button onClick={() => setShowForm(false)}>取消</Button>
            </View>
          </View>
        )}
      </View>
    </AuthGuard>
  )
}
