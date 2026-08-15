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
      setError('Missing book id')
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
    if (isSuccess(res)) Taro.showToast({ title: 'Reading plan added', icon: 'success' })
    else showErrorToast(res.code)
  }

  async function reserve() {
    if (!book) return
    setWorking(true)
    const availabilityRes = await queryAvailability(book.bookId)
    if (!isSuccess(availabilityRes) || !availabilityRes.data?.available) {
      setWorking(false)
      Taro.showToast({ title: availabilityRes.message || 'Book is unavailable', icon: 'none' })
      return
    }
    setAvailability(availabilityRes.data.location || 'Available')
    const res = await reserveBook(book.bookId)
    setWorking(false)
    if (isSuccess(res)) Taro.showToast({ title: 'Reservation recorded', icon: 'success' })
    else showErrorToast(res.code)
  }

  if (loading || error || !book) {
    return <View className='book-detail'><StateView loading={loading} error={error} onRetry={() => loadBook(routeBookId())} /></View>
  }

  return (
    <View className='book-detail'>
      {book.cover ? <Image className='book-detail__cover' src={book.cover} mode='aspectFit' /> : <View className='book-detail__cover-placeholder'>No cover</View>}
      <View className='book-detail__info'>
        <Text className='book-detail__title'>{book.title}</Text>
        <Text className='book-detail__meta'>Author: {book.author || 'Unknown'}</Text>
        {book.edition && <Text className='book-detail__meta'>Edition: {book.edition}</Text>}
        {book.publisher && <Text className='book-detail__meta'>Publisher: {book.publisher}</Text>}
        {book.isbn && <Text className='book-detail__meta'>ISBN: {book.isbn}</Text>}
        {book.librarySource && <Text className='book-detail__meta'>Source: {book.librarySource}</Text>}
        {book.location && <Text className='book-detail__meta'>Location: {book.location}</Text>}
        <Text className='book-detail__summary'>{book.summary || 'The platform stores metadata only; full text is not hosted here.'}</Text>
      </View>
      {availability && <Text className='book-detail__availability'>{availability}</Text>}
      <View className='book-detail__actions'>
        <Button onClick={openAi}>Ask AI about this book</Button>
        <Button onClick={addPlan} disabled={working}>Add reading plan</Button>
        <Button onClick={() => Taro.navigateTo({ url: `/pages/notes/index?bookId=${encodeURIComponent(book.bookId)}` })}>Write a note</Button>
        <Button onClick={reserve} disabled={working}>Reserve (mock until library authorization)</Button>
      </View>
    </View>
  )
}
