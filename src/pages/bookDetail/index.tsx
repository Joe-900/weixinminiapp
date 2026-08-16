import { Button, Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useEffect, useState } from 'react'
import { bookDetail } from '../../services/bookDetail'
import { createReadingPlan } from '../../services/readingService'
import { queryAvailability, reserveBook } from '../../services/reservationService'
import { isSuccess, showErrorToast } from '../../services/request'
import StateView from '../../components/StateView'
import type { Book } from '../../types/book'
import './index.scss'

export default function BookDetail() {
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [working, setWorking] = useState(false)
  const [availability, setAvailability] = useState('')

  function routeBookId(): string {
    return Taro.getCurrentInstance().router?.params?.bookId ?? ''
  }

  async function loadBook(bookId: string) {
    setLoading(true)
    setError('')
    const res = await bookDetail(bookId)
    if (isSuccess(res) && res.data) setBook(res.data)
    else {
      setError(res.message)
      showErrorToast(res.code)
    }
    setLoading(false)
  }

  useEffect(() => {
    const bookId = routeBookId()
    if (!bookId) {
      setError('缺少书籍 ID')
      setLoading(false)
      return
    }
    loadBook(bookId)
  }, [])

  async function openAi() {
    if (!book) return
    const query = [
      `bookId=${encodeURIComponent(book.bookId)}`,
      `title=${encodeURIComponent(book.title)}`,
      `author=${encodeURIComponent(book.author)}`,
      `edition=${encodeURIComponent(book.edition ?? '')}`,
      `isbn=${encodeURIComponent(book.isbn)}`,
    ].join('&')
    Taro.navigateTo({ url: `/pages/aiChat/index?${query}` })
  }

  async function addPlan() {
    if (!book) return
    setWorking(true)
    const res = await createReadingPlan({ bookId: book.bookId })
    setWorking(false)
    if (isSuccess(res)) Taro.showToast({ title: '已加入阅读计划', icon: 'success' })
    else showErrorToast(res.code)
  }

  async function reserve() {
    if (!book) return
    setWorking(true)
    const availabilityRes = await queryAvailability(book.bookId)
    if (!isSuccess(availabilityRes) || !availabilityRes.data?.available) {
      setWorking(false)
      Taro.showToast({ title: availabilityRes.message || '当前书籍不可预约', icon: 'none' })
      return
    }
    setAvailability(availabilityRes.data.location || '当前可预约')
    const res = await reserveBook(book.bookId)
    setWorking(false)
    if (isSuccess(res)) Taro.showToast({ title: '预约记录已保存', icon: 'success' })
    else showErrorToast(res.code)
  }

  if (loading || error || !book) {
    return <View className='book-detail'><StateView loading={loading} error={error} onRetry={() => loadBook(routeBookId())} /></View>
  }

  return (
    <View className='book-detail'>
      {book.cover ? <Image className='book-detail__cover' src={book.cover} mode='aspectFit' /> : <View className='book-detail__cover-placeholder'>暂无封面</View>}
      <View className='book-detail__info'>
        <Text className='book-detail__title'>{book.title}</Text>
        <Text className='book-detail__meta'>作者：{book.author || '未知'}</Text>
        {book.edition && <Text className='book-detail__meta'>版本：{book.edition}</Text>}
        {book.publisher && <Text className='book-detail__meta'>出版社：{book.publisher}</Text>}
        {book.isbn && <Text className='book-detail__meta'>ISBN：{book.isbn}</Text>}
        {book.librarySource && <Text className='book-detail__meta'>数据来源：{book.librarySource}</Text>}
        {book.location && <Text className='book-detail__meta'>馆藏位置：{book.location}</Text>}
        <Text className='book-detail__summary'>{book.summary || '平台仅保存图书元数据，不提供整本书正文。'}</Text>
      </View>
      {availability && <Text className='book-detail__availability'>{availability}</Text>}
      <View className='book-detail__actions'>
        <Button onClick={openAi}>询问 AI</Button>
        <Button onClick={addPlan} disabled={working}>加入阅读计划</Button>
        <Button onClick={() => Taro.navigateTo({ url: `/pages/notes/index?bookId=${encodeURIComponent(book.bookId)}` })}>记录笔记</Button>
        <Button onClick={reserve} disabled={working}>预约（当前为本地模拟）</Button>
      </View>
    </View>
  )
}
