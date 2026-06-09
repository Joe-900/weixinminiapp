/**
 * @file 书籍详情页
 * @description 展示书籍完整元数据，支持AI伴读入口和笔记入口
 */

import { View, Text, Image, Button } from '@tarojs/components'
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
      setError('缺少书籍编号')
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
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }

  function goToAiChat() {
    if (!book) return
    Taro.navigateTo({ url: `/pages/aiChat/index?bookId=${book.bookId}` })
  }

  function goToNotes() {
    if (!book) return
    Taro.navigateTo({ url: `/pages/notes/index?bookId=${book.bookId}` })
  }

  function goBack() {
    Taro.navigateBack()
  }

  if (loading || error || !book) {
    return (
      <View className='book-detail'>
        <StateView
          loading={loading}
          error={error}
          onRetry={() => {
            const params = Taro.getCurrentInstance().router?.params
            if (params?.bookId) loadBook(params.bookId)
          }}
        />
      </View>
    )
  }

  return (
    <View className='book-detail'>
      <View className='book-detail__header'>
        <View className='book-detail__back' onClick={goBack}>
          <Text>返回</Text>
        </View>
        <Text className='book-detail__header-title'>书籍详情</Text>
      </View>
      <View className='book-detail__content'>
        <Image className='book-detail__cover' src={book.cover} mode='aspectFit' />
        <View className='book-detail__info'>
          <Text className='book-detail__title'>{book.title}</Text>
          <Text className='book-detail__author'>作者：{book.author}</Text>
          <Text className='book-detail__isbn'>ISBN：{book.isbn}</Text>
          <Text className='book-detail__summary'>{book.summary}</Text>
        </View>
      </View>
      <View className='book-detail__actions'>
        <Button className='book-detail__action-btn book-detail__action-btn--ai' onClick={goToAiChat}>
          AI伴读
        </Button>
        <Button className='book-detail__action-btn book-detail__action-btn--notes' onClick={goToNotes}>
          读书笔记
        </Button>
      </View>
    </View>
  )
}
