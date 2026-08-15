import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore } from '../../store/userStore'
import './index.scss'

const ROLE_LABEL = {
  user: 'Reader',
  student: 'Student',
  teacher: 'Teacher',
  admin: 'Administrator',
}

export default function Profile() {
  const { nickname, role } = useUserStore()
  const go = (page: string) => Taro.navigateTo({ url: `/pages/${page}/index` })

  return (
    <View className='profile'>
      <View className='profile__card'>
        <Text className='profile__nickname'>{nickname || 'Reader'}</Text>
        <Text className='profile__role'>{ROLE_LABEL[role]}</Text>
      </View>
      <View className='profile__actions'>
        <Button className='profile__btn' onClick={() => go('notes')}>Notes and check-ins</Button>
        <Button className='profile__btn' onClick={() => go('reading')}>Reading plans</Button>
        <Button className='profile__btn' onClick={() => go('reservations')}>Reservations</Button>
        <Button className='profile__btn' onClick={() => go('community')}>Classes and groups</Button>
        <Button className='profile__btn' onClick={() => go('tasks')}>Reading tasks</Button>
        <Button className='profile__btn' onClick={() => go('ranking')}>Behavior ranking</Button>
        {role === 'admin' && <Button className='profile__btn profile__btn--admin' onClick={() => go('admin')}>Book metadata management</Button>}
      </View>
    </View>
  )
}
