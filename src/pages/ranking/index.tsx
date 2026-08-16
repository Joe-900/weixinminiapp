import { Button, Picker, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import { getRanking } from '../../services/rankingService'
import { listCommunityGroups } from '../../services/communityService'
import { isSuccess, showErrorToast } from '../../services/request'
import type { ClassGroup } from '../../types/community'
import type { RankingResult } from '../../types/reading'
import StateView from '../../components/StateView'
import './index.scss'

export default function Ranking() {
  const [groups, setGroups] = useState<ClassGroup[]>([])
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
    Promise.all([listCommunityGroups(), load(routeGroupId)]).then(([groupsRes]) => {
      if (isSuccess(groupsRes) && groupsRes.data) setGroups(groupsRes.data)
    })
  }, [load])

  const pickerIndex = groupId ? groups.findIndex((group) => group.groupId === groupId) + 1 : 0
  const pickerOptions = ['全平台', ...groups.map((group) => group.name)]
  const scopeLabel = groupId ? groups.find((group) => group.groupId === groupId)?.name ?? '当前分组' : '全平台'

  return (
    <View className='ranking-page'>
      <Text className='ranking-page__notice'>排行榜只统计服务端记录的打卡、完成计划、任务提交、教师确认和小组参与，不代表整本书的理解能力排名。</Text>
      <View className='ranking-page__filter'>
        <Picker
          mode='selector'
          range={pickerOptions}
          value={pickerIndex < 0 ? 0 : pickerIndex}
          onChange={(event) => {
            const index = Number(event.detail.value)
            const nextGroupId = index === 0 ? '' : groups[index - 1]?.groupId ?? ''
            setGroupId(nextGroupId)
            load(nextGroupId)
          }}
        >
          <View className='ranking-page__picker'>查看范围：{scopeLabel}</View>
        </Picker>
        <Button onClick={() => load(groupId)}>刷新</Button>
      </View>
      <StateView loading={loading} empty={!loading && (ranking?.entries.length ?? 0) === 0} emptyText='暂时没有可计分的行为记录' />
      {ranking?.entries.map((entry) => (
        <View className='ranking-page__entry' key={entry.openid}>
          <Text className='ranking-page__rank'>第 {entry.rank} 名</Text>
          <View className='ranking-page__person'><Text>{entry.nickname}</Text><Text>{entry.validEventCount} 条有效记录</Text></View>
          <Text className='ranking-page__score'>{entry.score} 分</Text>
        </View>
      ))}
    </View>
  )
}
