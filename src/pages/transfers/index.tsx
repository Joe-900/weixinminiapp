import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import { cancelTransfer, confirmPickup, listTransfers } from '../../services/reservationService'
import { isSuccess, showErrorToast } from '../../services/request'
import { bookDetail } from '../../services/bookDetail'
import type { BookTransfer } from '../../types/reservation'
import type { Book } from '../../types/book'
import StateView from '../../components/StateView'
import './index.scss'

const STATUS_LABEL: Record<string, string> = {
  requested: '已申请',
  in_transit: '调拨中',
  arrived: '已到书',
  picked_up: '已取书',
  cancelled: '已取消',
}

const STATUS_COLOR: Record<string, string> = {
  requested: '#3b82f6',
  in_transit: '#f59e0b',
  arrived: '#10b981',
  picked_up: '#6b7280',
  cancelled: '#9ca3af',
}

export default function Transfers() {
  const [items, setItems] = useState<BookTransfer[]>([])
  const [bookMap, setBookMap] = useState<Record<string, Book>>({})
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await listTransfers()
    if (isSuccess(res) && res.data) {
      setItems(res.data)
      const books: Record<string, Book> = {}
      for (const item of res.data) {
        if (!books[item.bookId]) {
          const bookRes = await bookDetail(item.bookId)
          if (isSuccess(bookRes) && bookRes.data) books[item.bookId] = bookRes.data
        }
      }
      setBookMap(books)
    } else if (!isSuccess(res)) {
      showErrorToast(res.code)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function confirm(transferId: string) {
    const res = await confirmPickup(transferId)
    if (isSuccess(res)) {
      Taro.showToast({ title: '已确认取书', icon: 'success' })
      load()
    } else showErrorToast(res.code)
  }

  async function cancel(transferId: string) {
    const res = await cancelTransfer(transferId)
    if (isSuccess(res)) load()
    else showErrorToast(res.code)
  }

  function formatDeadline(ts?: number): string {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  }

  return (
    <View className='transfers-page'>
      <Text className='transfers-page__notice'>跨校区转取：从其他校区调入图书至您所在校区取书。</Text>
      <StateView loading={loading} empty={items.length === 0} emptyText='还没有转取记录' />
      {items.map((item) => {
        const book = bookMap[item.bookId]
        const active = item.status === 'requested' || item.status === 'in_transit' || item.status === 'arrived'
        return (
          <View className='transfers-page__item' key={item.transferId}>
            <View className='transfers-page__item-header'>
              <Text className='transfers-page__item-title'>{book?.title || item.bookId}</Text>
              <Text className='transfers-page__item-status' style={{ color: STATUS_COLOR[item.status] || '#666' }}>{STATUS_LABEL[item.status] || item.status}</Text>
            </View>
            <View className='transfers-page__item-body'>
              <Text className='transfers-page__item-row'>调出：{item.fromLocation}</Text>
              <Text className='transfers-page__item-row'>取书：{item.toLocation}</Text>
              <Text className='transfers-page__item-row'>预计：{item.estimatedDays}个工作日</Text>
              {item.pickupCode && <Text className='transfers-page__item-row transfers-page__item-code'>取书码：{item.pickupCode}</Text>}
              {item.pickupDeadline && <Text className='transfers-page__item-row'>截止：{formatDeadline(item.pickupDeadline)}</Text>}
              {item.message && <Text className='transfers-page__item-row'>{item.message}</Text>}
            </View>
            {active && (
              <View className='transfers-page__item-actions'>
                {(item.status === 'arrived' || item.status === 'in_transit') && <Button size='mini' className='transfers-page__btn' onClick={() => confirm(item.transferId)}>确认取书</Button>}
                <Button size='mini' className='transfers-page__btn transfers-page__btn--cancel' onClick={() => cancel(item.transferId)}>取消</Button>
              </View>
            )}
          </View>
        )
      })}
    </View>
  )
}
