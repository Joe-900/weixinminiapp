import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore } from '../../store/userStore'
import './index.scss'

const ROLE_LABEL = {
  user: '普通读者',
  student: '学生',
  teacher: '教师',
  admin: '管理员',
}

export default function Profile() {
  const { nickname, role } = useUserStore()
  const go = (page: string) => Taro.navigateTo({ url: `/pages/${page}/index` })

  return (
    <View className='profile'>
      <View className='profile__card'>
        <Text className='profile__nickname'>{nickname || '读者'}</Text>
        <Text className='profile__role'>{ROLE_LABEL[role]}</Text>
      </View>
      <View className='profile__actions'>
        <Button className='profile__btn' onClick={() => go('notes')}>笔记与打卡</Button>
        <Button className='profile__btn' onClick={() => go('reading')}>阅读计划</Button>
        <Button className='profile__btn' onClick={() => go('reservations')}>我的预约</Button>
        <Button className='profile__btn' onClick={() => go('transfers')}>转取记录</Button>
        <Button className='profile__btn' onClick={() => go('community')}>班级与小组</Button>
        <Button className='profile__btn' onClick={() => go('tasks')}>阅读任务</Button>
        <Button className='profile__btn' onClick={() => go('ranking')}>行为排行榜</Button>
        {role === 'admin' && <Button className='profile__btn profile__btn--admin' onClick={() => go('admin')}>图书元数据管理</Button>}
      </View>
    </View>
  )
}
