import { Button, Text, View } from '@tarojs/components'
import { useCallback, useEffect, useState } from 'react'
import { cancelReservation, listReservations } from '../../services/reservationService'
import { isSuccess, showErrorToast } from '../../services/request'
import type { Reservation } from '../../types/reservation'
import StateView from '../../components/StateView'
import './index.scss'

export default function Reservations() {
  const [items, setItems] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(false)
  const load = useCallback(async () => {
    setLoading(true)
    const res = await listReservations()
    if (isSuccess(res) && res.data) setItems(res.data)
    else if (!isSuccess(res)) showErrorToast(res.code)
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function cancel(reservationId: string) {
    const res = await cancelReservation(reservationId)
    if (isSuccess(res)) load()
    else showErrorToast(res.code)
  }

  return (
    <View className='reservations-page'>
      <Text className='reservations-page__notice'>当前使用安全的本地预约模拟，不会访问真实图书馆账号。</Text>
      <StateView loading={loading} empty={items.length === 0} emptyText='还没有预约记录' />
      {items.map((item) => (
        <View className='reservations-page__item' key={item.reservationId}>
          <View><Text>{item.bookId}</Text><Text>{item.status} · {item.provider}</Text><Text>{item.message}</Text></View>
          {(item.status === 'pending' || item.status === 'confirmed') && <Button size='mini' onClick={() => cancel(item.reservationId)}>取消预约</Button>}
        </View>
      ))}
    </View>
  )
}
