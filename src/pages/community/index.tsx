import { Button, Input, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import { createCommunityGroup, joinCommunityGroup, listCommunityGroups, listCommunityMembers } from '../../services/communityService'
import { isSuccess, showErrorToast } from '../../services/request'
import { useUserStore } from '../../store/userStore'
import type { ClassGroup, CommunityGroupType, CommunityMember } from '../../types/community'
import StateView from '../../components/StateView'
import './index.scss'

export default function Community() {
  const role = useUserStore((state) => state.role)
  const [groups, setGroups] = useState<ClassGroup[]>([])
  const [name, setName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [type, setType] = useState<CommunityGroupType>('reading_group')
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<Record<string, CommunityMember[]>>({})
  const [expandedGroupId, setExpandedGroupId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res = await listCommunityGroups()
    if (isSuccess(res) && res.data) {
      setGroups(res.data)
      const memberEntries = await Promise.all(res.data.map(async (group) => {
        const memberRes = await listCommunityMembers(group.groupId)
        return [group.groupId, isSuccess(memberRes) && memberRes.data ? memberRes.data : []] as const
      }))
      setMembers(Object.fromEntries(memberEntries))
    }
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

  async function toggleMembers(groupId: string) {
    if (expandedGroupId === groupId) {
      setExpandedGroupId('')
      return
    }
    setExpandedGroupId(groupId)
    if (members[groupId]) return
    const res = await listCommunityMembers(groupId)
    if (isSuccess(res) && res.data) setMembers((current) => ({ ...current, [groupId]: res.data! }))
    else if (!isSuccess(res)) showErrorToast(res.code)
  }

  const groupTypeLabel = (groupType: CommunityGroupType) => groupType === 'class' ? '班级' : '阅读小组'
  const memberRoleLabel = (memberRole: CommunityMember['role']) => {
    if (memberRole === 'teacher') return '教师'
    if (memberRole === 'owner') return '组长'
    return '成员'
  }

  return (
    <View className='community-page'>
      <View className='community-page__notice'>本地演示已预置“示例阅读班”和“名著讨论小组”，可直接查看成员、任务和排行榜。</View>
      <View className='community-page__card'>
        <Text className='community-page__heading'>创建班级或阅读小组</Text>
        <Input value={name} placeholder='请输入名称' onInput={(event) => setName(event.detail.value)} />
        <View className='community-page__switch'>
          <Button size='mini' className={type === 'reading_group' ? 'active' : ''} onClick={() => setType('reading_group')}>阅读小组</Button>
          {(role === 'teacher' || role === 'admin') && <Button size='mini' className={type === 'class' ? 'active' : ''} onClick={() => setType('class')}>班级</Button>}
        </View>
        <Button onClick={create}>创建</Button>
      </View>
      <View className='community-page__card'>
        <Text className='community-page__heading'>通过邀请码加入</Text>
        <Input value={inviteCode} placeholder='请输入邀请码，例如 READ2026' onInput={(event) => setInviteCode(event.detail.value)} />
        <Button onClick={join}>加入</Button>
      </View>
      <StateView loading={loading} empty={groups.length === 0} emptyText='暂时没有可见的班级或小组' />
      {groups.map((group) => (
        <View className='community-page__group' key={group.groupId}>
          <View className='community-page__group-main'>
            <Text className='community-page__group-name'>{group.name}</Text>
            <Text className='community-page__group-meta'>{groupTypeLabel(group.type)} · 邀请码 {group.inviteCode} · {members[group.groupId]?.length ?? 0} 名成员</Text>
            {expandedGroupId === group.groupId && (
              <View className='community-page__members'>
                {(members[group.groupId] ?? []).map((member) => (
                  <Text className='community-page__member' key={member.memberId}>{member.openid}（{memberRoleLabel(member.role)}）</Text>
                ))}
              </View>
            )}
          </View>
          <View className='community-page__group-actions'>
            <Button size='mini' onClick={() => toggleMembers(group.groupId)}>{expandedGroupId === group.groupId ? '收起成员' : '查看成员'}</Button>
            <Button size='mini' onClick={() => Taro.navigateTo({ url: `/pages/tasks/index?groupId=${group.groupId}` })}>任务</Button>
            <Button size='mini' onClick={() => Taro.navigateTo({ url: `/pages/ranking/index?groupId=${group.groupId}` })}>排行榜</Button>
          </View>
        </View>
      ))}
    </View>
  )
}
