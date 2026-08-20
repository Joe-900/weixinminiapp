/**
 * @file AI domain local mock tests (LAI1-LAI10)
 * @description Full AI chain tests: session creation, message persistence, context assembly, limits, fallback
 */

import { MemoryRepository } from '../mock/memoryRepository'
import { MockAiClient } from '../mock/mockAiClient'
import { aiMain } from './index'
import { ErrorCode } from '../../../src/types/common'
import { seedUsers, seedBooks, SEED_ADMIN_OPENID, SEED_USER_OPENID } from '../mock/seedData'
import type { Repository } from '../interfaces/repository'
import type { AiClient } from '../interfaces/aiClient'
import type { ApiResponse } from '../../../src/types/common'
import type {
  AiProviderConfig,
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

describe('AI Provider configuration', () => {
  const env = {
    AI_BASE_URL: 'https://env.example.com/v1',
    AI_MODEL: 'env-model',
    AI_API_KEY: 'env-provider-value',
  }

  test('admin can read a redacted provider configuration', async () => {
    const result = await aiMain(
      { action: 'getConfig' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
      aiClient,
      env,
    ) as ApiResponse<{ baseURL: string; model: string; apiKeyConfigured: boolean }>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data).toMatchObject({
      baseURL: env.AI_BASE_URL,
      model: env.AI_MODEL,
      apiKeyConfigured: true,
    })
    expect(JSON.stringify(result.data)).not.toContain(env.AI_API_KEY)
  })

  test('non-admin cannot read or update provider configuration', async () => {
    const read = await aiMain(
      { action: 'getConfig' },
      MOCK_CTX,
      repo,
      aiClient,
      env,
    )
    const update = await aiMain(
      { action: 'updateConfig', baseURL: 'https://new.example.com/v1', apiKey: 'new-provider-value' },
      MOCK_CTX,
      repo,
      aiClient,
      env,
    )

    expect(read.code).toBe(ErrorCode.FORBIDDEN)
    expect(update.code).toBe(ErrorCode.FORBIDDEN)
  })

  test('admin update persists overrides and never returns the API key', async () => {
    const result = await aiMain(
      { action: 'updateConfig', baseURL: 'https://database.example.com/v1' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
      aiClient,
      env,
    ) as ApiResponse<{ baseURL: string; apiKeyConfigured: boolean }>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data).toMatchObject({ baseURL: 'https://database.example.com/v1', apiKeyConfigured: true })
    expect(JSON.stringify(result.data)).not.toContain('env-provider-value')
    expect(await repo.getAiProviderConfig()).toMatchObject({
      baseURL: 'https://database.example.com/v1',
    })

    const withKey = await aiMain(
      { action: 'updateConfig', apiKey: 'database-provider-value' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
      aiClient,
      env,
    ) as ApiResponse<{ baseURL: string; apiKeyConfigured: boolean }>
    expect(withKey.code).toBe(ErrorCode.SUCCESS)
    expect(withKey.data).toMatchObject({ baseURL: 'https://database.example.com/v1', apiKeyConfigured: true })
    expect(JSON.stringify(withKey.data)).not.toContain('database-provider-value')
    expect(await repo.getAiProviderConfig()).toMatchObject({
      baseURL: 'https://database.example.com/v1',
      apiKey: 'database-provider-value',
    })

    const cleared = await aiMain(
      { action: 'updateConfig', apiKey: null },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
      aiClient,
      env,
    ) as ApiResponse<{ apiKeyConfigured: boolean }>
    expect(cleared.code).toBe(ErrorCode.SUCCESS)
    expect(cleared.data!.apiKeyConfigured).toBe(true)
    expect((await repo.getAiProviderConfig())!.apiKey).toBeNull()
  })

  test('chat applies persisted overrides and keeps environment fallbacks', async () => {
    await repo.saveAiProviderConfig({
      configId: 'default',
      baseURL: 'https://database.example.com/v1',
      apiKey: null,
      updatedAt: 123,
      updatedBy: SEED_ADMIN_OPENID,
    })

    let configured: Record<string, string | undefined> = {}
    const configuredClient: AiClient = {
      configure(environment) {
        configured = environment
        return this
      },
      async chat() {
        return 'configured reply'
      },
    }

    const result = await aiMain(
      { action: 'chat', bookId: 'book_001', question: '请继续阅读' },
      MOCK_CTX,
      repo,
      configuredClient,
      env,
    )

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(configured).toMatchObject({
      AI_BASE_URL: 'https://database.example.com/v1',
      AI_API_KEY: 'env-provider-value',
      AI_MODEL: 'env-model',
    })
  })

  test('admin update rejects invalid URLs', async () => {
    const result = await aiMain(
      { action: 'updateConfig', baseURL: 'file:///not-a-provider' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
      aiClient,
      env,
    )
    expect(result.code).toBe(ErrorCode.BAD_REQUEST)
  })

  test('configuration storage failures return INTERNAL_ERROR instead of empty config', async () => {
    class FailingConfigRepository extends MemoryRepository {
      async getAiProviderConfig(): Promise<AiProviderConfig | null> {
        throw new Error('config store unavailable')
      }
    }

    const failingRepo = new FailingConfigRepository()
    failingRepo.seedUsers(seedUsers)
    failingRepo.seedBooks(seedBooks)

    const read = await aiMain(
      { action: 'getConfig' },
      { OPENID: SEED_ADMIN_OPENID },
      failingRepo,
      aiClient,
      env,
    )
    const chat = await aiMain(
      { action: 'chat', bookId: 'book_001', question: '配置读取失败时不应继续请求' },
      MOCK_CTX,
      failingRepo,
      aiClient,
      env,
    )

    expect(read.code).toBe(ErrorCode.INTERNAL_ERROR)
    expect(chat.code).toBe(ErrorCode.INTERNAL_ERROR)
  })
})
