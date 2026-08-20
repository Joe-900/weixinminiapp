/**
 * @file ChatBubble component
 * @description Display a single chat message bubble
 */

import { View, Text } from '@tarojs/components'
import type { AiMessage } from '../../types/ai'
import './index.scss'

interface ChatBubbleProps {
  message: AiMessage
}

export default function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <View className={`chat-bubble ${isUser ? 'chat-bubble--user' : 'chat-bubble--assistant'}`}>
      {message.imageFileId && <Text className='chat-bubble__image-note'>已附图片</Text>}
      <Text className='chat-bubble__content'>{message.content}</Text>
    </View>
  )
}
