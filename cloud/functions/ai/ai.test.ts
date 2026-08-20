/**
 * @file AI domain local mock tests (LAI1-LAI10)
 * @description Full AI chain tests: session creation, message persistence, context assembly, limits, fallback
 */

import { MemoryRepository } from '../mock/memoryRepository'
import { MockAiClient } from '../mock/mockAiClient'
import { aiMain } from './index'
import { ErrorCode } from '../../../src/types/common'
import { seedUsers, seedBooks, SEED_USER_OPENID } from '../mock/seedData'
import type { Repository } from '../interfaces/repository'
import type { AiClient } from '../interfaces/aiClient'
import type { ApiResponse } from '../../../src/types/common'
import type {
  ChatResult,
  AiMessage,
  AiSession,
  OpenAIMultimodalChatMessage,
} from '../../../src/types/ai'
import type { Storage } from '../interfaces/storage'

let repo: Repository
let aiClient: MockAiClient

beforeEach(() => {
  repo = new MemoryRepository()
  aiClient = new MockAiClient()
  ;(repo as MemoryRepository).seedUsers(seedUsers)
  ;(repo as MemoryRepository).seedBooks(seedBooks)
})

const MOCK_CTX = { OPENID: SEED_USER_OPENID }

describe('AI domain - LAI1: New session creation', () => {
  test('Chat without sessionId creates new session', async () => {
    const result = await aiMain(
      { action: 'chat', bookId: 'book_001', question: 'Hello' },
      MOCK_CTX,
      repo,
      aiClient,
    ) as ApiResponse<ChatResult>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data!.sessionId).toBeTruthy()
  })
})

describe('AI domain - LAI2: Message persistence', () => {
  test('User question and AI reply are both persisted', async () => {
    const result = await aiMain(
      { action: 'chat', bookId: 'book_001', question: 'Tell me more' },
      MOCK_CTX,
      repo,
      aiClient,
    ) as ApiResponse<ChatResult>

    const sessionId = result.data!.sessionId
    const messages = await repo.getSessionMessages(sessionId, 100)

    expect(messages.length).toBe(2)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content).toBe('Tell me more')
    expect(messages[1].role).toBe('assistant')
    expect(messages[1].content).toBeTruthy()
  })
})

describe('AI domain - LAI3: Context assembly order', () => {
  test('System prompt first, history by time, question last', async () => {
    const capturedMessages: Array<{ role: string; content: string }> = []
    const spyClient: AiClient = {
      async chat(messages) {
        capturedMessages.push(...messages)
        return 'Spy reply'
      },
    }

    await aiMain(
      { action: 'chat', bookId: 'book_001', question: 'Second question' },
      MOCK_CTX,
      repo,
      spyClient,
    )

    expect(capturedMessages[0].role).toBe('system')
    expect(capturedMessages[capturedMessages.length - 1].role).toBe('user')
    expect(capturedMessages[capturedMessages.length - 1].content).toBe('Second question')
  })
})

describe('AI domain - LAI4: System prompt injects book info', () => {
  test('System message contains book title and author', async () => {
    const capturedMessages: Array<{ role: string; content: string }> = []
    const spyClient: AiClient = {
      async chat(messages) {
        capturedMessages.push(...messages)
        return 'Reply'
      },
    }

    await aiMain(
      { action: 'chat', bookId: 'book_001', question: 'Hi' },
      MOCK_CTX,
      repo,
      spyClient,
    )

    const systemMsg = capturedMessages.find((m) => m.role === 'system')
    expect(systemMsg).toBeTruthy()
    expect(systemMsg!.content).toContain('Journey to the West')
    expect(systemMsg!.content).toContain('Wu Chengen')
  })
})

describe('AI domain - LAI5: History limit', () => {
  test('Only last N history messages are included', async () => {
    const sessionId = 'test_session_history'
    await (repo as MemoryRepository).createSession({
      openid: SEED_USER_OPENID,
      bookId: 'book_001',
      title: 'Test',
      createdAt: Date.now(),
    })

    for (let i = 0; i < 15; i++) {
      await repo.addMessage({
        sessionId,
        openid: SEED_USER_OPENID,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        createdAt: Date.now() + i * 1000,
      })
    }

    const capturedMessages: Array<{ role: string; content: string }> = []
    const spyClient: AiClient = {
      async chat(messages) {
        capturedMessages.push(...messages)
        return 'Reply'
      },
    }

    await aiMain(
      { action: 'chat', bookId: 'book_001', question: 'New question', sessionId },
      MOCK_CTX,
      repo,
      spyClient,
      { AI_HISTORY_LIMIT: '5' },
    )

    const nonSystemMessages = capturedMessages.filter((m) => m.role !== 'system')
    expect(nonSystemMessages.length).toBeLessThanOrEqual(5 + 1)
  })
})

describe('AI domain - LAI6: Continue chat with existing sessionId', () => {
  test('Chat with sessionId continues the same session', async () => {
    const first = await aiMain(
      { action: 'chat', bookId: 'book_001', question: 'First question' },
      MOCK_CTX,
      repo,
      aiClient,
    ) as ApiResponse<ChatResult>

    const sessionId = first.data!.sessionId

    const second = await aiMain(
      { action: 'chat', bookId: 'book_001', question: 'Second question', sessionId },
      MOCK_CTX,
      repo,
      aiClient,
    ) as ApiResponse<ChatResult>

    expect(second.code).toBe(ErrorCode.SUCCESS)
    expect(second.data!.sessionId).toBe(sessionId)
  })
})

describe('AI domain - LAI7: Question too long returns 2002', () => {
  test('Question exceeding length limit returns AI_LIMIT', async () => {
    const longQuestion = 'a'.repeat(1001)
    const result = await aiMain(
      { action: 'chat', bookId: 'book_001', question: longQuestion },
      MOCK_CTX,
      repo,
      aiClient,
      { AI_QUESTION_LENGTH_LIMIT: '1000' },
    )

    expect(result.code).toBe(ErrorCode.AI_LIMIT)
  })
})

describe('AI domain - LAI8: Daily frequency limit returns 2002', () => {
  test('Exceeding daily chat limit returns AI_LIMIT', async () => {
    for (let i = 0; i < 3; i++) {
      await aiMain(
        { action: 'chat', bookId: 'book_001', question: `Question ${i}` },
        MOCK_CTX,
        repo,
        aiClient,
        { AI_DAILY_LIMIT: '3' },
      )
    }

    const result = await aiMain(
      { action: 'chat', bookId: 'book_001', question: 'One more' },
      MOCK_CTX,
      repo,
      aiClient,
      { AI_DAILY_LIMIT: '3' },
    )

    expect(result.code).toBe(ErrorCode.AI_LIMIT)
  })
})

describe('AI domain - LAI9: Error fallback returns 2001', () => {
  test('AI client error returns AI_ERROR', async () => {
    aiClient.setFailMode(true)

    const result = await aiMain(
      { action: 'chat', bookId: 'book_001', question: 'Hello' },
      MOCK_CTX,
      repo,
      aiClient,
    )

    expect(result.code).toBe(ErrorCode.AI_ERROR)
  })
})

describe('AI domain - LAI10: Mock reply persisted', () => {
  test('Mock AI reply is saved to database', async () => {
    const result = await aiMain(
      { action: 'chat', bookId: 'book_001', question: 'What is this book about?' },
      MOCK_CTX,
      repo,
      aiClient,
    ) as ApiResponse<ChatResult>

    const sessionId = result.data!.sessionId
    const messages = await repo.getSessionMessages(sessionId, 100)
    const assistantMsg = messages.find((m) => m.role === 'assistant')

    expect(assistantMsg).toBeTruthy()
    expect(assistantMsg!.content).toContain('Journey to the West')
  })
})

describe('AI domain - multimodal image context', () => {
  test('image-only question uses the default question and sends an image part', async () => {
    let captured: OpenAIMultimodalChatMessage[] = []
    const storage: Storage = {
      async upload() { return 'file://unused' },
      async getTempFileURL(fileId) { return `https://files.example/${fileId}` },
    }
    const multimodalClient: AiClient = {
      async chat() { return 'text reply' },
      async chatMultimodal(messages) {
        captured = messages
        return 'image reply'
      },
    }

    const result = await aiMain(
      {
        action: 'chat',
        bookId: 'book_001',
        question: '',
        image: { fileId: 'image_001', mimeType: 'image/png' },
      },
      MOCK_CTX,
      repo,
      multimodalClient,
      undefined,
      storage,
    ) as ApiResponse<ChatResult>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    const userMessage = captured[captured.length - 1]
    expect(Array.isArray(userMessage.content)).toBe(true)
    expect(userMessage.content).toEqual([
      { type: 'text', text: '请解释图片中的文字，并结合这本书的背景回答。' },
      { type: 'image_url', image_url: { url: 'https://files.example/image_001' } },
    ])
  })

  test('historical image messages are rebuilt with temporary URLs', async () => {
    const storage: Storage = {
      async upload() { return 'file://unused' },
      async getTempFileURL(fileId) { return `https://files.example/${fileId}` },
    }
    let firstMessages: OpenAIMultimodalChatMessage[] = []
    let secondMessages: OpenAIMultimodalChatMessage[] = []
    let usedMultimodalForSecond = false
    const multimodalClient: AiClient = {
      async chat(messages) {
        return 'text reply'
      },
      async chatMultimodal(messages) {
        if (firstMessages.length === 0) firstMessages = messages
        else {
          usedMultimodalForSecond = true
          secondMessages = messages
        }
        return 'image reply'
      },
    }

    const first = await aiMain(
      { action: 'chat', bookId: 'book_001', question: '图片里的人物是谁？', image: { fileId: 'image_002', mimeType: 'image/jpeg' } },
      MOCK_CTX,
      repo,
      multimodalClient,
      undefined,
      storage,
    ) as ApiResponse<ChatResult>
    expect(first.code).toBe(ErrorCode.SUCCESS)

    await aiMain(
      { action: 'chat', bookId: 'book_001', question: '请继续说明。', sessionId: first.data!.sessionId },
      MOCK_CTX,
      repo,
      multimodalClient,
      undefined,
      storage,
    )

    expect(firstMessages.length).toBeGreaterThan(0)
    expect(usedMultimodalForSecond).toBe(true)
    const historicalUser = secondMessages.find((message) => message.role === 'user')
    expect(historicalUser?.content).toEqual([
      { type: 'text', text: '图片里的人物是谁？' },
      { type: 'image_url', image_url: { url: 'https://files.example/image_002' } },
    ])
  })

  test('image storage failures use the storage error code', async () => {
    const storage: Storage = {
      async upload() { return 'file://unused' },
      async getTempFileURL() { throw new Error('storage unavailable') },
    }
    const result = await aiMain(
      { action: 'chat', bookId: 'book_001', question: '图片问题', image: { fileId: 'image_003', mimeType: 'image/jpeg' } },
      MOCK_CTX,
      repo,
      aiClient,
      undefined,
      storage,
    )
    expect(result.code).toBe(ErrorCode.STORAGE_ERROR)
  })
})

describe('AI domain - loadHistory and listSessions', () => {
  test('loadHistory returns messages for a session', async () => {
    const chatResult = await aiMain(
      { action: 'chat', bookId: 'book_001', question: 'Hello' },
      MOCK_CTX,
      repo,
      aiClient,
    ) as ApiResponse<ChatResult>

    const sessionId = chatResult.data!.sessionId

    const historyResult = await aiMain(
      { action: 'loadHistory', sessionId },
      MOCK_CTX,
      repo,
      aiClient,
    ) as ApiResponse<AiMessage[]>

    expect(historyResult.code).toBe(ErrorCode.SUCCESS)
    expect(historyResult.data!.length).toBeGreaterThan(0)
  })

  test('listSessions returns user sessions', async () => {
    await aiMain(
      { action: 'chat', bookId: 'book_001', question: 'Hello' },
      MOCK_CTX,
      repo,
      aiClient,
    )

    const result = await aiMain(
      { action: 'listSessions' },
      MOCK_CTX,
      repo,
      aiClient,
    ) as ApiResponse<AiSession[]>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data!.length).toBeGreaterThan(0)
  })

  test('Accessing another user session returns 1005', async () => {
    const otherOpenid = 'other_user_999'
    await (repo as MemoryRepository).createUser({
      openid: otherOpenid,
      nickname: 'Other',
      avatar: '',
      role: 'user',
      createdAt: Date.now(),
    })

    const session = await repo.createSession({
      openid: otherOpenid,
      bookId: 'book_001',
      title: 'Other session',
      createdAt: Date.now(),
    })

    const result = await aiMain(
      { action: 'loadHistory', sessionId: session.sessionId },
      MOCK_CTX,
      repo,
      aiClient,
    )

    expect(result.code).toBe(ErrorCode.ACCESS_DENIED)
  })
})
