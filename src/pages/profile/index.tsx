/**
 * @file Profile page
 * @description User info, admin entry (conditional on role)
 */

import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore } from '../../store/userStore'
import AuthGuard from '../../components/AuthGuard'
import './index.scss'

export default function Profile() {
  const { nickname, role, openid } = useUserStore()

  function goToAdmin() {
    Taro.navigateTo({ url: '/pages/admin/index' })
  }

  function goToNotes() {
    Taro.navigateTo({ url: '/pages/notes/index' })
  }

  return (
    <View className='profile'>
      <View className='profile__card'>
        <Text className='profile__nickname'>{nickname || 'Reader'}</Text>
        <Text className='profile__role'>Role: {role}</Text>
      </View>

      <View className='profile__actions'>
        <Button className='profile__btn' onClick={goToNotes}>My Notes</Button>

        {role === 'admin' && (
          <Button className='profile__btn profile__btn--admin' onClick={goToAdmin}>
            Book Management
          </Button>
        )}
      </View>
    </View>
  )
}
