/**
 * @file 首页 - 书单列表
 * @description 分页展示书籍列表，支持下拉刷新和上拉加载
 */

import { Button, Input, Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useBookStore } from '../../store/bookStore'
import { bookList } from '../../services/bookService'
import { isSuccess, showErrorToast } from '../../services/request'
import BookCard from '../../components/BookCard'
import StateView from '../../components/StateView'
import type { Book, BookKeywordField, BookSortField, BookSortOrder } from '../../types/book'
import './index.scss'

export default function Home() {
  const {
    bookList: books,
    total,
    page,
    pageSize,
    setBookList,
    keyword,
    keywordField,
    sortBy,
    sortOrder,
    setFilters,
  } = useBookStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [draftKeyword, setDraftKeyword] = useState(keyword)
  const initialized = useRef(false)

  const keywordFields: Array<{ value: BookKeywordField; label: string }> = [
    { value: 'all', label: '书名或作者' },
    { value: 'title', label: '书名' },
    { value: 'author', label: '作者' },
  ]
  const sortOptions: Array<{ sortBy: BookSortField; sortOrder: BookSortOrder; label: string }> = [
    { sortBy: 'createdAt', sortOrder: 'desc', label: '最近加入' },
    { sortBy: 'title', sortOrder: 'asc', label: '书名正序' },
    { sortBy: 'title', sortOrder: 'desc', label: '书名倒序' },
    { sortBy: 'author', sortOrder: 'asc', label: '作者正序' },
    { sortBy: 'author', sortOrder: 'desc', label: '作者倒序' },
    { sortBy: 'availableCount', sortOrder: 'desc', label: '可借数量优先' },
  ]

  const loadBooks = useCallback(async (
    p: number,
    kw: string,
    field: BookKeywordField,
    orderBy: BookSortField,
    order: BookSortOrder,
  ) => {
    setLoading(true)
    setError('')
    try {
      const res = await bookList({
        page: p,
        pageSize,
        keyword: kw || undefined,
        keywordField: field,
        sortBy: orderBy,
        sortOrder: order,
      })
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

  const applyFilters = useCallback((
    nextKeyword = draftKeyword,
    nextField = keywordField,
    nextSortBy = sortBy,
    nextSortOrder = sortOrder,
  ) => {
    const normalizedKeyword = nextKeyword.trim()
    setDraftKeyword(normalizedKeyword)
    setFilters(normalizedKeyword, nextField, nextSortBy, nextSortOrder)
    loadBooks(1, normalizedKeyword, nextField, nextSortBy, nextSortOrder)
  }, [draftKeyword, keywordField, loadBooks, setFilters, sortBy, sortOrder])

  const handleRefresh = useCallback(() => {
    loadBooks(1, keyword, keywordField, sortBy, sortOrder)
  }, [keyword, keywordField, loadBooks, sortBy, sortOrder])

  const handleLoadMore = useCallback(() => {
    if (books.length < total) {
      loadBooks(page + 1, keyword, keywordField, sortBy, sortOrder)
    }
  }, [books.length, keyword, keywordField, loadBooks, page, sortBy, sortOrder, total])

  const handleBookClick = useCallback((bookId: string) => {
    Taro.navigateTo({ url: `/pages/bookDetail/index?bookId=${bookId}` })
  }, [])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    loadBooks(1, keyword, keywordField, sortBy, sortOrder)
  }, [keyword, keywordField, loadBooks, sortBy, sortOrder])

  const selectedFieldIndex = keywordFields.findIndex((item) => item.value === keywordField)
  const selectedSortIndex = sortOptions.findIndex((item) => item.sortBy === sortBy && item.sortOrder === sortOrder)
  const selectedField = keywordFields[selectedFieldIndex] ?? keywordFields[0]
  const selectedSort = sortOptions[selectedSortIndex] ?? sortOptions[0]

  return (
    <View className='home'>
      <View className='home__filters'>
        <View className='home__search-row'>
          <Input
            className='home__search-input'
            value={draftKeyword}
            placeholder='搜索书名或作者（支持模糊匹配）'
            onInput={(event) => setDraftKeyword(event.detail.value)}
            onConfirm={() => applyFilters()}
          />
          <Button size='mini' className='home__search-button' onClick={() => applyFilters()}>筛选</Button>
        </View>
        <View className='home__filter-row'>
          <Picker
            mode='selector'
            range={keywordFields.map((item) => item.label)}
            value={selectedFieldIndex < 0 ? 0 : selectedFieldIndex}
            onChange={(event) => {
              const next = keywordFields[Number(event.detail.value)] ?? keywordFields[0]
              applyFilters(draftKeyword, next.value, sortBy, sortOrder)
            }}
          >
            <View className='home__picker'>筛选范围：{selectedField.label}</View>
          </Picker>
          <Picker
            mode='selector'
            range={sortOptions.map((item) => item.label)}
            value={selectedSortIndex < 0 ? 0 : selectedSortIndex}
            onChange={(event) => {
              const next = sortOptions[Number(event.detail.value)] ?? sortOptions[0]
              applyFilters(draftKeyword, keywordField, next.sortBy, next.sortOrder)
            }}
          >
            <View className='home__picker'>排序：{selectedSort.label}</View>
          </Picker>
        </View>
        <Text className='home__sort-hint'>当前顺序：{selectedSort.label}。切换排序后会从第一页重新加载。</Text>
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
