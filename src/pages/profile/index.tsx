/**
 * @file 个人中心页面
 * @description 用户信息展示、管理员入口（按角色条件显示）
 */

import { View, Text, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useUserStore } from '../../store/userStore'
import './index.scss'

export default function Profile() {
  const { nickname, role } = useUserStore()

  function goToAdmin() {
    Taro.navigateTo({ url: '/pages/admin/index' })
  }

  function goToNotes() {
    Taro.navigateTo({ url: '/pages/notes/index' })
  }

  return (
    <View className='profile'>
      <View className='profile__card'>
        <Text className='profile__nickname'>{nickname || '阅读者'}</Text>
        <Text className='profile__role'>{role === 'admin' ? '管理员' : '普通用户'}</Text>
      </View>

      <View className='profile__actions'>
        <Button className='profile__btn' onClick={goToNotes}>我的笔记</Button>

        {role === 'admin' && (
          <Button className='profile__btn profile__btn--admin' onClick={goToAdmin}>
            书籍管理
          </Button>
        )}
      </View>
    </View>
  )
}
