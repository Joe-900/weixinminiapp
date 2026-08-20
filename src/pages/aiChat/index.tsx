import { Button, Image, Input, ScrollView, Text, Textarea, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useCallback, useEffect, useState } from 'react'
import { aiChat, aiListSessions, aiLoadHistory } from '../../services/aiService'
import { bookDetail } from '../../services/bookDetail'
import { uploadAiImage } from '../../services/uploadService'
import { isSuccess, showErrorToast } from '../../services/request'
import { useAiStore } from '../../store/aiStore'
import ChatBubble from '../../components/ChatBubble'
import StateView from '../../components/StateView'
import type { AiImageInput, AiSession, BookContextInput } from '../../types'
import { DEFAULT_IMAGE_QUESTION } from '../../types/ai'
import { ErrorCode } from '../../types/common'
import './index.scss'

type AiView = 'sessions' | 'chat'

function decodeParam(value?: string): string {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function sessionBookTitle(session: AiSession): string {
  const match = session.title.match(/《(.+?)》/)
  return match?.[1] ?? session.title
}

function formatSessionTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function inferImageMimeType(filePath: string): string {
  const extension = filePath.split('?')[0].split('.').pop()?.toLowerCase()
  if (extension === 'png') return 'image/png'
  if (extension === 'webp') return 'image/webp'
  if (extension === 'gif') return 'image/gif'
  return 'image/jpeg'
}

export default function AiChat() {
  const {
    currentSessionId,
    sessions,
    messages,
    setCurrentSession,
    setSessions,
    setMessages,
    addMessage,
    loading,
    setLoading,
  } = useAiStore()
  const [view, setView] = useState<AiView>('sessions')
  const [bookId, setBookId] = useState('')
  const [book, setBook] = useState<BookContextInput>({ title: '' })
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  const [image, setImage] = useState<AiImageInput | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [loadingBook, setLoadingBook] = useState(false)

  const loadSessions = useCallback(async () => {
    const res = await aiListSessions()
    if (isSuccess(res) && res.data) setSessions(res.data)
  }, [setSessions])

  const loadBook = useCallback(async (id: string) => {
    if (!id) return
    setLoadingBook(true)
    const res = await bookDetail(id)
    setLoadingBook(false)
    if (isSuccess(res) && res.data) {
      setBook({
        title: res.data.title,
        author: res.data.author,
        edition: res.data.edition,
        isbn: res.data.isbn,
      })
    }
  }, [])

  useEffect(() => {
    const params = Taro.getCurrentInstance().router?.params
    const routeBookId = params?.bookId ?? ''
    const routeBook: BookContextInput = {
      title: decodeParam(params?.title),
      author: decodeParam(params?.author) || undefined,
      edition: decodeParam(params?.edition) || undefined,
      isbn: decodeParam(params?.isbn) || undefined,
    }
    if (routeBookId || routeBook.title) {
      setView('chat')
      setBookId(routeBookId)
      if (routeBook.title) setBook(routeBook)
      if (routeBookId) loadBook(routeBookId)
    } else {
      setView('sessions')
    }
    loadSessions()
  }, [loadBook, loadSessions])

  async function handleChooseImage() {
    try {
      const result = await Taro.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
      })
      const file = result.tempFiles[0]
      if (!file?.tempFilePath) return
      if (file.fileType && file.fileType !== 'image') {
        Taro.showToast({ title: '只能上传图片', icon: 'none' })
        return
      }
      setLoading(true)
      const uploaded = await uploadAiImage(file.tempFilePath, inferImageMimeType(file.tempFilePath))
      setImage(uploaded)
      setImagePreview(file.tempFilePath)
    } catch (error) {
      const message = error instanceof Error ? error.message : '图片选择失败'
      Taro.showToast({ title: message, icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  async function handleSend() {
    if (loading) return
    const title = book.title.trim()
    const text = question.trim()
    if (!title || (!text && !image)) {
      Taro.showToast({ title: '请填写书名，并输入问题或上传图片', icon: 'none' })
      return
    }

    setLoading(true)
    const params = {
      bookId: bookId || undefined,
      book: { ...book, title },
      question: text || DEFAULT_IMAGE_QUESTION,
      context: context.trim() || undefined,
      image: image ?? undefined,
      sessionId: currentSessionId || undefined,
    }
    const res = await aiChat(params)
    setLoading(false)

    if (isSuccess(res) && res.data) {
      const now = Date.now()
      addMessage({
        _id: `temp_u_${now}`,
        msgId: `temp_u_${now}`,
        sessionId: res.data.sessionId,
        openid: '',
        role: 'user',
        content: text || '[图片提问]',
        imageFileId: image?.fileId,
        createdAt: now,
      })
      addMessage({
        _id: `temp_a_${now}`,
        msgId: `temp_a_${now}`,
        sessionId: res.data.sessionId,
        openid: '',
        role: 'assistant',
        content: res.data.reply,
        createdAt: now,
      })
      setCurrentSession(res.data.sessionId)
      setView('chat')
      setQuestion('')
      setContext('')
      setImage(null)
      setImagePreview('')
      loadSessions()
    } else if (res.code === ErrorCode.AI_ERROR || res.code === ErrorCode.AI_LIMIT) {
      Taro.showToast({ title: res.message, icon: 'none', duration: 3000 })
    } else {
      showErrorToast(res.code)
    }
  }

  async function handleSelectSession(session: AiSession) {
    setLoading(true)
    setCurrentSession(session.sessionId)
    setMessages([])
    setView('chat')
    const syntheticBook = session.bookId.startsWith('metadata_')
    setBookId(syntheticBook ? '' : session.bookId)
    if (syntheticBook) setBook({ title: sessionBookTitle(session) })
    else await loadBook(session.bookId)
    const res = await aiLoadHistory(session.sessionId)
    if (isSuccess(res) && res.data) setMessages(res.data)
    else if (!isSuccess(res)) showErrorToast(res.code)
    setLoading(false)
  }

  function handleNewSession() {
    setCurrentSession('')
    setMessages([])
    setBookId('')
    setBook({ title: '' })
    setImage(null)
    setImagePreview('')
    setQuestion('')
    setContext('')
    setView('chat')
  }

  function handleBackToSessions() {
    setQuestion('')
    setContext('')
    setImage(null)
    setImagePreview('')
    setView('sessions')
    loadSessions()
  }

  if (view === 'sessions') {
    return (
      <View className='ai-chat ai-chat--sessions'>
        <View className='ai-chat__header'>
          <Text className='ai-chat__title'>AI 伴读</Text>
          <Button size='mini' className='ai-chat__header-button' onClick={handleNewSession}>新建伴读</Button>
        </View>
        <View className='ai-chat__session-intro'>选择一个会话继续讨论，或新建一个书籍伴读会话。</View>
        <ScrollView className='ai-chat__session-list' scrollY>
          {sessions.length === 0 && <Text className='ai-chat__empty'>还没有伴读会话</Text>}
          {sessions.map((session) => (
            <View
              key={session.sessionId}
              className={`ai-chat__session-item ${currentSessionId === session.sessionId ? 'ai-chat__session-item--active' : ''}`}
              onClick={() => handleSelectSession(session)}
            >
              <View className='ai-chat__session-main'>
                <Text className='ai-chat__session-title'>{session.title || `关于《${session.bookId}》的伴读`}</Text>
                <Text className='ai-chat__session-book'>对应书籍：{sessionBookTitle(session)}</Text>
              </View>
              <Text className='ai-chat__session-time'>{formatSessionTime(session.createdAt)}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    )
  }

  return (
    <View className='ai-chat'>
      <View className='ai-chat__header'>
        <Button size='mini' className='ai-chat__header-button ai-chat__back-button' onClick={handleBackToSessions}>‹ 返回会话列表</Button>
        <Text className='ai-chat__title'>{book.title ? `伴读：${book.title}` : '新建伴读'}</Text>
        <Button size='mini' className='ai-chat__header-button ai-chat__new-button' onClick={handleNewSession}>新建</Button>
      </View>

      {!bookId && (
        <View className='ai-chat__book-form'>
          <Text className='ai-chat__form-label'>先填写书籍信息</Text>
          <Input
            className='ai-chat__book-input'
            placeholder='书名（必填）'
            value={book.title}
            onInput={(event) => setBook({ ...book, title: event.detail.value })}
          />
          <Input
            className='ai-chat__book-input'
            placeholder='作者（可选）'
            value={book.author ?? ''}
            onInput={(event) => setBook({ ...book, author: event.detail.value })}
          />
          <Input
            className='ai-chat__book-input'
            placeholder='版本或 ISBN（可选）'
            value={book.edition ?? book.isbn ?? ''}
            onInput={(event) => setBook({ ...book, edition: event.detail.value })}
          />
        </View>
      )}

      {loadingBook && <StateView loading />}
      <ScrollView className='ai-chat__messages' scrollY>
        {messages.length === 0 && <Text className='ai-chat__empty'>输入问题，开始和这本书讨论。</Text>}
        {messages.map((message, index) => <ChatBubble key={message.msgId || index} message={message} />)}
      </ScrollView>

      {imagePreview && (
        <View className='ai-chat__image-preview'>
          <Image src={imagePreview} mode='aspectFit' />
          <Button size='mini' onClick={() => { setImage(null); setImagePreview('') }}>移除图片</Button>
        </View>
      )}
      <Textarea
        className='ai-chat__context'
        placeholder='补充图片或片段的上下文（可选）'
        value={context}
        onInput={(event) => setContext(event.detail.value)}
      />
      <View className='ai-chat__input-bar'>
        <Button size='mini' className='ai-chat__image-button' disabled={loading} onClick={handleChooseImage}>上传图片</Button>
        <Input
          className='ai-chat__input'
          placeholder='输入你想问的问题'
          value={question}
          onInput={(event) => setQuestion(event.detail.value)}
          onConfirm={handleSend}
        />
        <Button size='mini' className='ai-chat__send-button' disabled={loading} onClick={handleSend}>
          {loading ? '发送中' : '发送'}
        </Button>
      </View>
    </View>
  )
}
