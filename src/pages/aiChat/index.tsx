/**
 * @file AI Chat page
 * @description AI reading companion chat with session list and history
 */

import { View, Text, Input, ScrollView } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useState, useEffect, useCallback } from 'react'
import { aiChat, aiLoadHistory, aiListSessions } from '../../services/aiService'
import { isSuccess, showErrorToast } from '../../services/request'
import { useAiStore } from '../../store/aiStore'
import ChatBubble from '../../components/ChatBubble'
import StateView from '../../components/StateView'
import type { AiSession } from '../../types/ai'
import { ErrorCode } from '../../types/common'
import './index.scss'

export default function AiChat() {
  const { currentSessionId, sessions, messages, setCurrentSession, setSessions, setMessages, addMessage, loading, setLoading } = useAiStore()
  const [question, setQuestion] = useState('')
  const [showSessions, setShowSessions] = useState(false)

  const loadSessions = useCallback(async () => {
    const res = await aiListSessions()
    if (isSuccess(res) && res.data) {
      setSessions(res.data)
    }
  }, [setSessions])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

  async function handleSend() {
    if (!question.trim()) return

    const bookId = 'book_001'
    setLoading(true)

    const res = await aiChat({
      bookId,
      question: question.trim(),
      sessionId: currentSessionId || undefined,
    })

    setLoading(false)

    if (isSuccess(res) && res.data) {
      addMessage({
        _id: `temp_u_${Date.now()}`,
        msgId: `temp_u_${Date.now()}`,
        sessionId: res.data.sessionId,
        openid: '',
        role: 'user',
        content: question.trim(),
        createdAt: Date.now(),
      })
      addMessage({
        _id: `temp_a_${Date.now()}`,
        msgId: `temp_a_${Date.now()}`,
        sessionId: res.data.sessionId,
        openid: '',
        role: 'assistant',
        content: res.data.reply,
        createdAt: Date.now(),
      })
      setCurrentSession(res.data.sessionId)
      setQuestion('')
      loadSessions()
    } else if (res.code === ErrorCode.AI_ERROR || res.code === ErrorCode.AI_LIMIT) {
      Taro.showToast({ title: res.message, icon: 'none', duration: 3000 })
    } else {
      showErrorToast(res.code)
    }
  }

  async function handleSelectSession(session: AiSession) {
    setCurrentSession(session.sessionId)
    setShowSessions(false)

    const res = await aiLoadHistory(session.sessionId)
    if (isSuccess(res) && res.data) {
      setMessages(res.data)
    }
  }

  function handleNewSession() {
    setCurrentSession('')
    setMessages([])
    setShowSessions(false)
  }

  return (
    <View className='ai-chat'>
      <View className='ai-chat__header'>
        <Text className='ai-chat__title' onClick={() => setShowSessions(!showSessions)}>Sessions</Text>
        <Text className='ai-chat__new' onClick={handleNewSession}>+ New</Text>
      </View>

      {showSessions && (
        <View className='ai-chat__sessions'>
          {sessions.map((s) => (
            <View
              key={s.sessionId}
              className={`ai-chat__session-item ${currentSessionId === s.sessionId ? 'ai-chat__session-item--active' : ''}`}
              onClick={() => handleSelectSession(s)}
            >
              <Text>{s.title}</Text>
            </View>
          ))}
        </View>
      )}

      <ScrollView className='ai-chat__messages' scrollY scrollIntoView=''>
        <StateView empty={messages.length === 0} emptyText='Start a conversation' />
        {messages.map((msg, idx) => (
          <ChatBubble key={msg.msgId ?? idx} message={msg} />
        ))}
      </ScrollView>

      <View className='ai-chat__input-bar'>
        <Input
          className='ai-chat__input'
          placeholder='Ask about the book...'
          value={question}
          onInput={(e) => setQuestion(e.detail.value)}
          onConfirm={handleSend}
        />
        <View className='ai-chat__send-btn' onClick={handleSend}>
          <Text>Send</Text>
        </View>
      </View>
    </View>
  )
}
