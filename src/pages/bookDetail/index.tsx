/**
 * @file Book detail page
 * @description Display full book metadata
 */

import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect } from 'react'
import { bookDetail } from '../../services/bookDetail'
import { isSuccess, showErrorToast } from '../../services/request'
import StateView from '../../components/StateView'
import type { Book } from '../../types/book'
import './index.scss'

export default function BookDetail() {
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params
    const bookId = params?.bookId ?? ''
    if (!bookId) {
      setError('bookId is missing')
      setLoading(false)
      return
    }
    loadBook(bookId)
  }, [])

  async function loadBook(bookId: string) {
    setLoading(true)
    setError('')
    try {
      const res = await bookDetail(bookId)
      if (isSuccess(res) && res.data) {
        setBook(res.data)
      } else {
        setError(res.message)
        showErrorToast(res.code)
      }
    } catch {
      setError('Load failed')
    } finally {
      setLoading(false)
    }
  }

  if (loading || error || !book) {
    return (
      <View className='book-detail'>
        <StateView loading={loading} error={error} onRetry={() => {
          const params = Taro.getCurrentInstance().router?.params
          if (params?.bookId) loadBook(params.bookId)
        }} />
      </View>
    )
  }

  return (
    <View className='book-detail'>
      <Image className='book-detail__cover' src={book.cover} mode='aspectFit' />
      <View className='book-detail__info'>
        <Text className='book-detail__title'>{book.title}</Text>
        <Text className='book-detail__author'>Author: {book.author}</Text>
        <Text className='book-detail__isbn'>ISBN: {book.isbn}</Text>
        <Text className='book-detail__summary'>{book.summary}</Text>
      </View>
    </View>
  )
}
