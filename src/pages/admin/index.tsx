/**
 * @file Admin book management page
 * @description Admin can create, edit, online/offline books with status filter
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
      Taro.showToast({ title: 'Please fill required fields', icon: 'none' })
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
        Taro.showToast({ title: 'Updated', icon: 'success' })
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
        Taro.showToast({ title: 'Created', icon: 'success' })
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
      Taro.showToast({ title: 'Status updated', icon: 'success' })
      loadBooks()
    } else {
      showErrorToast(res.code)
    }
  }

  return (
    <AuthGuard requiredRole='admin'>
      <View className='admin'>
        <View className='admin__header'>
          <Text className='admin__title'>Book Management</Text>
          <Button className='admin__add-btn' onClick={openCreateForm}>+ Add Book</Button>
        </View>

        <View className='admin__filter'>
          {(['all', 'online', 'offline'] as StatusFilter[]).map((s) => (
            <View
              key={s}
              className={`admin__filter-item ${statusFilter === s ? 'admin__filter-item--active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              <Text>{s}</Text>
            </View>
          ))}
        </View>

        <StateView loading={loading} empty={books.length === 0} emptyText='No books' />

        {books.map((book) => (
          <View key={book.bookId} className='admin__book-item'>
            <View className='admin__book-info'>
              <Text className='admin__book-title'>{book.title}</Text>
              <Text className='admin__book-status'>{book.status}</Text>
            </View>
            <View className='admin__book-actions'>
              <Button size='mini' onClick={() => openEditForm(book)}>Edit</Button>
              <Button size='mini' onClick={() => handleToggleStatus(book)}>
                {book.status === 'online' ? 'Offline' : 'Online'}
              </Button>
            </View>
          </View>
        ))}

        {showForm && (
          <View className='admin__form'>
            <Text className='admin__form-title'>{editBook ? 'Edit Book' : 'Add Book'}</Text>
            <Input className='admin__input' placeholder='Title' value={formTitle} onInput={(e) => setFormTitle(e.detail.value)} />
            <Input className='admin__input' placeholder='Author' value={formAuthor} onInput={(e) => setFormAuthor(e.detail.value)} />
            <Input className='admin__input' placeholder='ISBN' value={formIsbn} onInput={(e) => setFormIsbn(e.detail.value)} />
            <Textarea className='admin__textarea' placeholder='Summary' value={formSummary} onInput={(e) => setFormSummary(e.detail.value)} />
            <Input className='admin__input' placeholder='Cover URL or fileID' value={formCover} onInput={(e) => setFormCover(e.detail.value)} />
            <View className='admin__form-actions'>
              <Button onClick={handleSubmit}>Save</Button>
              <Button onClick={() => setShowForm(false)}>Cancel</Button>
            </View>
          </View>
        )}
      </View>
    </AuthGuard>
  )
}
