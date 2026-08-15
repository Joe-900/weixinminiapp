import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import { createCommunityGroup, joinCommunityGroup, listCommunityGroups } from '../../services/communityService'
import { isSuccess, showErrorToast } from '../../services/request'
import { useUserStore } from '../../store/userStore'
import type { ClassGroup, CommunityGroupType } from '../../types/community'
import StateView from '../../components/StateView'
import './index.scss'

export default function Community() {
  const role = useUserStore((state) => state.role)
  const [groups, setGroups] = useState<ClassGroup[]>([])
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [type, setType] = useState<CommunityGroupType>('reading_group')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await listCommunityGroups()
    if (isSuccess(res) && res.data) setGroups(res.data)
    else if (!isSuccess(res)) showErrorToast(res.code)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function create() {
    if (!name.trim()) return
    const res = await createCommunityGroup({ name: name.trim(), type })
    if (isSuccess(res)) { setName(''); load() } else showErrorToast(res.code)
  }

  async function join() {
    const res = await joinCommunityGroup(inviteCode.trim())
    if (isSuccess(res)) { setInviteCode(''); load() } else showErrorToast(res.code)
  }

  return (
    <View className='community-page'>
      <View className='community-page__card'>
        <Text className='community-page__heading'>Create a space</Text>
        <Input value={name} placeholder='Class or reading group name' onInput={(event) => setName(event.detail.value)} />
        <View className='community-page__switch'>
          <Button size='mini' className={type === 'reading_group' ? 'active' : ''} onClick={() => setType('reading_group')}>Reading group</Button>
          {(role === 'teacher' || role === 'admin') && <Button size='mini' className={type === 'class' ? 'active' : ''} onClick={() => setType('class')}>Class</Button>}
        </View>
        <Button onClick={create}>Create</Button>
      </View>
      <View className='community-page__card'>
        <Text className='community-page__heading'>Join with invite code</Text>
        <Input value={inviteCode} placeholder='Invite code' onInput={(event) => setInviteCode(event.detail.value)} />
        <Button onClick={join}>Join</Button>
      </View>
      <StateView loading={loading} empty={groups.length === 0} emptyText='No groups yet' />
      {groups.map((group) => (
        <View className='community-page__group' key={group.groupId}>
          <View><Text className='community-page__group-name'>{group.name}</Text><Text className='community-page__group-meta'>{group.type} · code {group.inviteCode}</Text></View>
          <View className='community-page__group-actions'>
            <Button size='mini' onClick={() => Taro.navigateTo({ url: `/pages/tasks/index?groupId=${group.groupId}` })}>Tasks</Button>
            <Button size='mini' onClick={() => Taro.navigateTo({ url: `/pages/ranking/index?groupId=${group.groupId}` })}>Ranking</Button>
          </View>
        </View>
      ))}
    </View>
  )
}
