/**
 * @file StateView 空态与加载组件
 * @description 统一处理空态、加载中、加载失败
 */

import { View, Text } from '@tarojs/components'
import './index.scss'

interface StateViewProps {
  loading?: boolean
  empty?: boolean
  error?: string
  onRetry?: () => void
  emptyText?: string
}

export default function StateView({
  loading = false,
  empty = false,
  error = '',
  onRetry,
  emptyText = '暂无数据',
}: StateViewProps) {
  if (loading) {
    return (
      <View className='state-view'>
        <Text className='state-view__text'>加载中...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View className='state-view'>
        <Text className='state-view__text state-view__text--error'>{error}</Text>
        {onRetry && (
          <View className='state-view__retry' onClick={onRetry}>
            <Text>重试</Text>
          </View>
        )}
      </View>
    )
  }

  if (empty) {
    return (
      <View className='state-view'>
        <Text className='state-view__text'>{emptyText}</Text>
      </View>
    )
  }

  return null
}
