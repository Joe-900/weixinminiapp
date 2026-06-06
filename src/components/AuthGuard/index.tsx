/**
 * @file AuthGuard 权限包裹组件
 * @description 根据用户角色控制页面/元素的可见性
 * 注意：前端隐藏只是体验优化，不得作为安全手段
 */

import { PropsWithChildren } from 'react'
import { View, Text } from '@tarojs/components'
import { useUserStore } from '../../store/userStore'
import type { UserRole } from '../../types/user'

interface AuthGuardProps {
  requiredRole?: UserRole
  fallback?: React.ReactNode
}

export default function AuthGuard({
  children,
  requiredRole,
  fallback,
}: PropsWithChildren<AuthGuardProps>) {
  const { isLoggedIn, role } = useUserStore()

  if (!isLoggedIn) {
    return (
      <View className='auth-guard'>
        <Text>请先登录</Text>
      </View>
    )
  }

  if (requiredRole && role !== requiredRole) {
    return (
      <>{fallback ?? <View className='auth-guard'><Text>权限不足</Text></View>}</>
    )
  }

  return <>{children}</>
}
