/**
 * @file Home page - Book list
 * @description Display paginated book list with pull-down refresh and pull-up load
 */

import { View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useCallback } from 'react'
import { useBookStore } from '../../store/bookStore'
import { bookList } from '../../services/bookService'
import { isSuccess, showErrorToast } from '../../services/request'
import BookCard from '../../components/BookCard'
import StateView from '../../components/StateView'
import type { Book } from '../../types/book'
import './index.scss'

export default function Home() {
  const { bookList: books, total, page, pageSize, setBookList, keyword } = useBookStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadBooks = useCallback(async (p: number, kw?: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await bookList({ page: p, pageSize, keyword: kw })
      if (isSuccess(res) && res.data) {
        const newBooks = p === 1 ? res.data.list : [...books, ...res.data.list]
        setBookList(newBooks, res.data.total, p)
      } else {
        setError(res.message)
        showErrorToast(res.code)
      }
    } catch {
      setError('Load failed')
    } finally {
      setLoading(false)
    }
  }, [books, pageSize, setBookList, keyword])

  const handleRefresh = useCallback(() => {
    loadBooks(1, keyword)
  }, [loadBooks, keyword])

  const handleLoadMore = useCallback(() => {
    if (books.length < total) {
      loadBooks(page + 1, keyword)
    }
  }, [books.length, total, page, loadBooks, keyword])

  const handleBookClick = useCallback((bookId: string) => {
    Taro.navigateTo({ url: `/pages/bookDetail/index?bookId=${bookId}` })
  }, [])

  if (!loading && books.length === 0 && !error) {
    loadBooks(1)
  }

  return (
    <View className='home'>
      <StateView loading={loading && books.length === 0} empty={books.length === 0 && !loading} error={error} onRetry={handleRefresh} emptyText='No books yet' />
      {books.map((book: Book) => (
        <BookCard key={book.bookId} book={book} onClick={handleBookClick} />
      ))}
      {books.length > 0 && books.length < total && (
        <View className='home__load-more' onClick={handleLoadMore}>
          Load more
        </View>
      )}
    </View>
  )
}
