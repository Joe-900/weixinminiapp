import { Image, Input, ScrollView, Text, Textarea, View } from '@tarojs/components'
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
import { ErrorCode } from '../../types/common'
import './index.scss'

function decodeParam(value?: string): string {
  if (!value) return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
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
  const [bookId, setBookId] = useState('')
  const [book, setBook] = useState<BookContextInput>({ title: '' })
  const [question, setQuestion] = useState('')
  const [context, setContext] = useState('')
  const [image, setImage] = useState<AiImageInput | null>(null)
  const [imagePreview, setImagePreview] = useState('')
  const [showSessions, setShowSessions] = useState(false)
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
    setBookId(routeBookId)
    if (routeBook.title) setBook(routeBook)
    if (routeBookId) loadBook(routeBookId)
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
      setLoading(true)
      const uploaded = await uploadAiImage(file.tempFilePath, file.fileType === 'image' ? 'image/jpeg' : 'image/jpeg')
      setImage(uploaded)
      setImagePreview(file.tempFilePath)
      setLoading(false)
    } catch (error) {
      setLoading(false)
      const message = error instanceof Error ? error.message : 'Image selection failed'
      Taro.showToast({ title: message, icon: 'none' })
    }
  }

  async function handleSend() {
    const title = book.title.trim()
    const text = question.trim()
    if (!title || (!text && !image)) {
      Taro.showToast({ title: 'Please provide a book title and a question or image', icon: 'none' })
      return
    }

    setLoading(true)
    const params = {
      bookId: bookId || undefined,
      book: { ...book, title },
      question: text || 'Please explain the text in this image in the context of this book.',
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
        content: text || '[Image question]',
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
    setCurrentSession(session.sessionId)
    setShowSessions(false)
    if (!bookId || bookId !== session.bookId) {
      setBookId(session.bookId)
      loadBook(session.bookId)
    }
    const res = await aiLoadHistory(session.sessionId)
    if (isSuccess(res) && res.data) setMessages(res.data)
  }

  function handleNewSession() {
    setCurrentSession('')
    setMessages([])
    setImage(null)
    setImagePreview('')
    setShowSessions(false)
  }

  return (
    <View className='ai-chat'>
      <View className='ai-chat__header'>
        <Text className='ai-chat__title' onClick={() => setShowSessions(!showSessions)}>
          {book.title ? `伴读：${book.title}` : 'AI 伴读'}
        </Text>
        <Text className='ai-chat__new' onClick={handleNewSession}>New</Text>
      </View>

      {showSessions && (
        <View className='ai-chat__sessions'>
          {sessions.length === 0 && <Text className='ai-chat__empty'>No conversations yet</Text>}
          {sessions.map((session) => (
            <View
              key={session.sessionId}
              className={`ai-chat__session-item ${currentSessionId === session.sessionId ? 'ai-chat__session-item--active' : ''}`}
              onClick={() => handleSelectSession(session)}
            >
              <Text>{session.title}</Text>
            </View>
          ))}
        </View>
      )}

      {!bookId && (
        <View className='ai-chat__book-form'>
          <Input
            className='ai-chat__book-input'
            placeholder='Book title (required)'
            value={book.title}
            onInput={(event) => setBook({ ...book, title: event.detail.value })}
          />
          <Input
            className='ai-chat__book-input'
            placeholder='Author (optional)'
            value={book.author ?? ''}
            onInput={(event) => setBook({ ...book, author: event.detail.value })}
          />
        </View>
      )}

      {loadingBook && <StateView loading />}
      <ScrollView className='ai-chat__messages' scrollY>
        {messages.length === 0 && <Text className='ai-chat__empty'>Ask a question about the book to begin.</Text>}
        {messages.map((message, index) => <ChatBubble key={message.msgId || index} message={message} />)}
      </ScrollView>

      {imagePreview && (
        <View className='ai-chat__image-preview'>
          <Image src={imagePreview} mode='aspectFit' />
          <Text onClick={() => { setImage(null); setImagePreview('') }}>Remove image</Text>
        </View>
      )}
      <Textarea
        className='ai-chat__context'
        placeholder='Optional context about the pictured passage'
        value={context}
        onInput={(event) => setContext(event.detail.value)}
      />
      <View className='ai-chat__input-bar'>
        <Text className='ai-chat__image-btn' onClick={handleChooseImage}>Photo</Text>
        <Input
          className='ai-chat__input'
          placeholder='Ask a question'
          value={question}
          onInput={(event) => setQuestion(event.detail.value)}
          onConfirm={handleSend}
        />
        <View className={`ai-chat__send-btn ${loading ? 'ai-chat__send-btn--disabled' : ''}`} onClick={loading ? undefined : handleSend}>
          <Text>{loading ? '…' : 'Send'}</Text>
        </View>
      </View>
    </View>
  )
}
