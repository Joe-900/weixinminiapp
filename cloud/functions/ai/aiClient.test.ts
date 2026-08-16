/**
 * @file OpenAI 兼容适配层测试
 * @description 无需真实 API Key：stub fetch 验证请求组装、错误分类与
 * aiService 的统一错误码映射。
 */

import { OpenAiClient } from '../cloud/openaiAiClient'
import { AiClientError } from '../cloud/aiClientError'
import { MemoryRepository } from '../mock/memoryRepository'
import { handleChat } from './aiService'
import { seedUsers, SEED_USER_OPENID } from '../mock/seedData'
import { ErrorCode } from '../../../src/types/common'
import type { ApiResponse } from '../../../src/types/common'
import type { ChatResult } from '../../../src/types/ai'

const ENV = {
  AI_BASE_URL: 'https://ai.example.com/v1',
  AI_API_KEY: 'test-key',
  AI_MODEL: 'test-model',
  AI_TIMEOUT: '1000',
  AI_MAX_TOKENS: '100',
  AI_TEMPERATURE: '0.7',
}

function mockFetch(impl: (url: string, init: RequestInit) => Promise<Partial<Response>>): void {
  global.fetch = impl as unknown as typeof fetch
}

function jsonResponse(status: number, body: unknown): Partial<Response> {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }
}

afterEach(() => {
  delete (global as { fetch?: unknown }).fetch
})

describe('OpenAiClient - request assembly', () => {
  test('sends OpenAI-compatible chat/completions request and returns content', async () => {
    let capturedUrl = ''
    let capturedInit: RequestInit | null = null
    mockFetch(async (url, init) => {
      capturedUrl = url
      capturedInit = init
      return jsonResponse(200, { choices: [{ message: { content: 'hi' } }] })
    })

    const client = new OpenAiClient(ENV)
    const reply = await client.chat([{ role: 'user', content: 'hello' }])
    expect(reply).toBe('hi')
    expect(capturedUrl).toBe('https://ai.example.com/v1/chat/completions')
    const headers = capturedInit!.headers as Record<string, string>
    expect(headers.Authorization).toBe('Bearer test-key')
    const body = JSON.parse(capturedInit!.body as string)
    expect(body.model).toBe('test-model')
    expect(body.messages).toEqual([{ role: 'user', content: 'hello' }])
  })

  test('strips trailing slashes from AI_BASE_URL', async () => {
    let capturedUrl = ''
    mockFetch(async (url) => {
      capturedUrl = url
      return jsonResponse(200, { choices: [{ message: { content: 'ok' } }] })
    })
    const client = new OpenAiClient({ ...ENV, AI_BASE_URL: 'https://ai.example.com/v1///' })
    await client.chat([{ role: 'user', content: 'x' }])
    expect(capturedUrl).toBe('https://ai.example.com/v1/chat/completions')
  })
})

describe('OpenAiClient - error classification', () => {
  test('missing env config throws config_missing', async () => {
    const client = new OpenAiClient({})
    await expect(client.chat([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      kind: 'config_missing',
    })
  })

  test('401 maps to config_missing (bad key)', async () => {
    mockFetch(async () => jsonResponse(401, {}))
    const client = new OpenAiClient(ENV)
    await expect(client.chat([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      kind: 'config_missing',
      status: 401,
    })
  })

  test('429 maps to quota', async () => {
    mockFetch(async () => jsonResponse(429, {}))
    const client = new OpenAiClient(ENV)
    await expect(client.chat([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      kind: 'quota',
      status: 429,
    })
  })

  test('non-JSON response maps to invalid_response', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error('bad json')
      },
    }))
    const client = new OpenAiClient(ENV)
    await expect(client.chat([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      kind: 'invalid_response',
    })
  })

  test('empty content maps to invalid_response', async () => {
    mockFetch(async () => jsonResponse(200, { choices: [{ message: { content: null } }] }))
    const client = new OpenAiClient(ENV)
    await expect(client.chat([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      kind: 'invalid_response',
    })
  })

  test('AbortError maps to timeout', async () => {
    mockFetch(async () => {
      const err = new Error('aborted')
      err.name = 'AbortError'
      throw err
    })
    const client = new OpenAiClient(ENV)
    await expect(client.chat([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
      kind: 'timeout',
    })
  })

  test('missing global fetch maps to config_missing with Node 18 hint', async () => {
    const original = global.fetch
    delete (global as { fetch?: unknown }).fetch
    try {
      const client = new OpenAiClient(ENV)
      await expect(client.chat([{ role: 'user', content: 'x' }])).rejects.toMatchObject({
        kind: 'config_missing',
      })
      await expect(client.chat([{ role: 'user', content: 'x' }])).rejects.toThrow(/Node 18/)
    } finally {
      global.fetch = original
    }
  })
})

describe('handleChat - unified error code mapping', () => {
  test('quota error surfaces as AI_QUOTA_EXCEEDED', async () => {
    mockFetch(async () => jsonResponse(429, {}))
    const repo = new MemoryRepository()
    ;(repo as MemoryRepository).seedUsers(seedUsers)
    const client = new OpenAiClient(ENV)
    const res = await handleChat(
      repo,
      client,
      SEED_USER_OPENID,
      { book: { title: '朝闻道', author: '刘慈欣' }, question: '这本书讲什么？' },
      ENV,
    ) as ApiResponse<ChatResult>
    expect(res.code).toBe(ErrorCode.AI_QUOTA_EXCEEDED)
  })

  test('provider 500 error surfaces as AI_ERROR', async () => {
    mockFetch(async () => jsonResponse(500, {}))
    const repo = new MemoryRepository()
    ;(repo as MemoryRepository).seedUsers(seedUsers)
    const client = new OpenAiClient(ENV)
    const res = await handleChat(
      repo,
      client,
      SEED_USER_OPENID,
      { book: { title: '朝闻道' }, question: '这本书讲什么？' },
      ENV,
    ) as ApiResponse<ChatResult>
    expect(res.code).toBe(ErrorCode.AI_ERROR)
  })

  test('AiClientError instances are recognized across module boundary', () => {
    const err = new AiClientError('quota', 'test')
    expect(err.kind).toBe('quota')
    expect(err.status).toBeUndefined()
  })
})
