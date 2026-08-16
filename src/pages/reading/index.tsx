import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import { completeReadingPlan, createReadingPlan, getReadingStat, listReadingPlans } from '../../services/readingService'
import { isSuccess, showErrorToast } from '../../services/request'
import type { ReadingPlan, ReadingStat } from '../../types/reading'
import StateView from '../../components/StateView'
import './index.scss'

const EMPTY_STAT: ReadingStat = { streakDays: 0, totalMinutes: 0, completedPlans: 0, eventCount: 0 }

export default function Reading() {
  const [bookId, setBookId] = useState('')
  const [plans, setPlans] = useState<ReadingPlan[]>([])
  const [stat, setStat] = useState(EMPTY_STAT)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [plansRes, statRes] = await Promise.all([listReadingPlans(), getReadingStat()])
    if (isSuccess(plansRes) && plansRes.data) setPlans(plansRes.data)
    if (isSuccess(statRes) && statRes.data) setStat(statRes.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    setBookId(Taro.getCurrentInstance().router?.params?.bookId ?? '')
    load()
  }, [load])

  async function addPlan() {
    if (!bookId.trim()) {
      Taro.showToast({ title: '请填写书籍 ID', icon: 'none' })
      return
    }
    const res = await createReadingPlan({ bookId: bookId.trim() })
    if (isSuccess(res)) load()
    else showErrorToast(res.code)
  }

  async function complete(planId: string) {
    const res = await completeReadingPlan(planId)
    if (isSuccess(res)) load()
    else showErrorToast(res.code)
  }

  return (
    <View className='reading-page'>
      <View className='reading-page__stats'>
        <Text>连续打卡：{stat.streakDays} 天</Text><Text>阅读时长：{stat.totalMinutes} 分钟</Text><Text>已完成计划：{stat.completedPlans}</Text><Text>行为记录：{stat.eventCount}</Text>
      </View>
      <View className='reading-page__form'>
        <Input value={bookId} placeholder='书籍 ID' onInput={(event) => setBookId(event.detail.value)} />
        <Button onClick={addPlan}>开始计划</Button>
      </View>
      <StateView loading={loading} empty={plans.length === 0} emptyText='还没有阅读计划' />
      {plans.map((plan) => (
        <View className='reading-page__plan' key={plan.planId}>
          <Text>{plan.bookId}</Text><Text>{plan.status === 'completed' ? '已完成' : '进行中'}</Text>
          {plan.status !== 'completed' && <Button size='mini' onClick={() => complete(plan.planId)}>完成计划</Button>}
        </View>
      ))}
    </View>
  )
}
