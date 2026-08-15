import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import { getRanking } from '../../services/rankingService'
import { isSuccess, showErrorToast } from '../../services/request'
import type { RankingResult } from '../../types/reading'
import StateView from '../../components/StateView'
import './index.scss'

export default function Ranking() {
  const [groupId, setGroupId] = useState('')
  const [ranking, setRanking] = useState<RankingResult | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (scopeGroupId?: string) => {
    setLoading(true)
    const res = await getRanking(scopeGroupId || undefined)
    if (isSuccess(res) && res.data) setRanking(res.data)
    else showErrorToast(res.code)
    setLoading(false)
  }, [])

  useEffect(() => {
    const routeGroupId = Taro.getCurrentInstance().router?.params?.groupId ?? ''
    setGroupId(routeGroupId)
    load(routeGroupId)
  }, [load])

  return (
    <View className='ranking-page'>
      <Text className='ranking-page__notice'>Scores use server-recorded check-ins, completed plans, task submissions, teacher confirmations and participation. They do not measure full-book comprehension.</Text>
      <View className='ranking-page__filter'>
        <Input value={groupId} placeholder='Group id (blank for global)' onInput={(event) => setGroupId(event.detail.value)} />
        <Button onClick={() => load(groupId.trim())}>Refresh</Button>
      </View>
      <StateView loading={loading} empty={!loading && (ranking?.entries.length ?? 0) === 0} emptyText='No verified behavior events yet' />
      {ranking?.entries.map((entry) => (
        <View className='ranking-page__entry' key={entry.openid}>
          <Text className='ranking-page__rank'>#{entry.rank}</Text>
          <View className='ranking-page__person'><Text>{entry.nickname}</Text><Text>{entry.validEventCount} valid events</Text></View>
          <Text className='ranking-page__score'>{entry.score}</Text>
        </View>
      ))}
    </View>
  )
}
