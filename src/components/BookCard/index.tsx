/**
 * @file BookCard component
 * @description Display book info as a card in the book list
 */

import { View, Text, Image } from '@tarojs/components'
import type { Book } from '../../types/book'
import './index.scss'

interface BookCardProps {
  book: Book
  onClick?: (bookId: string) => void
}

export default function BookCard({ book, onClick }: BookCardProps) {
  return (
    <View className='book-card' onClick={() => onClick?.(book.bookId)}>
      <Image className='book-card__cover' src={book.cover} mode='aspectFill' />
      <View className='book-card__info'>
        <Text className='book-card__title'>{book.title}</Text>
        <Text className='book-card__author'>作者：{book.author || '未知'}</Text>
      </View>
    </View>
  )
}
