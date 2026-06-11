/**
 * @file 首页 - 书单列表
 * @description 分页展示书籍列表，支持下拉刷新和上拉加载
 */

import { View, Input, Button, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useCallback } from 'react'
import { useBookStore } from '../../store/bookStore'
import { bookList } from '../../services/bookService'
import { isSuccess, showErrorToast } from '../../services/request'
import BookCard from '../../components/BookCard'
import StateView from '../../components/StateView'
import type { Book } from '../../types/book'
import './index.scss'

export default function Home() {
  const { bookList: books, total, page, pageSize, setBookList, keyword, setKeyword } = useBookStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchInput, setSearchInput] = useState(keyword)

  const loadBooks = useCallback(async (p: number, kw?: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await bookList({ page: p, pageSize, keyword: kw })
      if (isSuccess(res) && res.data) {
        const currentBooks = useBookStore.getState().bookList
        const newBooks = p === 1 ? res.data.list : [...currentBooks, ...res.data.list]
        setBookList(newBooks, res.data.total, p)
      } else {
        setError(res.message)
        showErrorToast(res.code)
      }
    } catch {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }, [pageSize, setBookList])

  const handleRefresh = useCallback(() => {
    loadBooks(1, keyword)
  }, [loadBooks, keyword])

  const handleLoadMore = useCallback(() => {
    if (books.length < total) {
      loadBooks(page + 1, keyword)
    }
  }, [books.length, total, page, loadBooks, keyword])

  const handleSearch = useCallback(() => {
    setKeyword(searchInput.trim())
    loadBooks(1, searchInput.trim())
  }, [searchInput, setKeyword, loadBooks])

  const handleBookClick = useCallback((bookId: string) => {
    Taro.navigateTo({ url: `/pages/bookDetail/index?bookId=${bookId}` })
  }, [])

  useEffect(() => {
    if (!loading && books.length === 0 && !error) {
      loadBooks(1)
    }
  }, [loading, books.length, error, loadBooks])

  const handleReservation = useCallback(() => {
    Taro.navigateTo({ url: '/pages/reservation/index' })
  }, [])

  return (
    <View className='home'>
      <View className='home__search-bar'>
        <Input
          className='home__search-input'
          placeholder='搜索书籍...'
          value={searchInput}
          onInput={(e) => setSearchInput(e.detail.value)}
          onConfirm={handleSearch}
        />
      </View>

      <View className='home__reservation-entry' onClick={handleReservation}>
        <Image
          className='home__reservation-icon'
          src='https://neeko-copilot.bytedance.net/api/text_to_image?prompt=library%20book%20reservation%20icon%20simple%20modern%20blue&image_size=square'
          mode='aspectFit'
        />
        <View className='home__reservation-content'>
          <Text className='home__reservation-title'>图书预约</Text>
          <Text className='home__reservation-desc'>跨校区借阅，馆员代借</Text>
        </View>
        <Text className='home__reservation-arrow'>›</Text>
      </View>

      <StateView loading={loading && books.length === 0} empty={books.length === 0 && !loading} error={error} onRetry={handleRefresh} emptyText='暂无书籍' />
      {books.map((book: Book) => (
        <BookCard key={book.bookId} book={book} onClick={handleBookClick} />
      ))}
      {books.length > 0 && books.length < total && (
        <View className='home__load-more' onClick={handleLoadMore}>
          加载更多
        </View>
      )}
    </View>
  )
}
