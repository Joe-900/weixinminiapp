/**
 * OpenAI 兼容协议 AIClient 实现（供应商适配层）。
 *
 * 适配约定（真实 Provider 验证清单见 docs/handover-plan.md 阶段 4）：
 * - AI_BASE_URL 应包含 API 版本路径，如 https://api.deepseek.com/v1（OpenAI 官方为 /v1）。
 *   本实现不做版本号猜测：按配置原样拼接 /chat/completions。
 * - 需要 Node 18+ 运行时（使用全局 fetch）；Node 16 云函数环境会给出明确配置错误。
 * - 多模态 image_url 走 OpenAI 兼容格式；图片可为云存储临时 URL 或 data:base64。
 * - API Key 只来自环境变量，绝不进入日志、响应或前端包。
 */

import type { AiClient } from '../interfaces/aiClient'
import type { OpenAIChatMessage, OpenAIMultimodalChatMessage } from '../../../src/types/ai'
import { AiClientError } from './aiClientError'

interface ChatCompletionParams {
  model: string
  messages: Array<OpenAIChatMessage | OpenAIMultimodalChatMessage>
  max_tokens?: number
  temperature?: number
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string | null } }>
}

export class OpenAiClient implements AiClient {
  private baseURL: string
  private apiKey: string
  private model: string
  private timeout: number
  private maxTokens: number
  private temperature: number

  constructor(env: Record<string, string | undefined>) {
    this.baseURL = (env.AI_BASE_URL ?? '').replace(/\/+$/, '')
    this.apiKey = env.AI_API_KEY ?? ''
    this.model = env.AI_MODEL ?? ''
    this.timeout = Number(env.AI_TIMEOUT ?? '30000')
    this.maxTokens = Number(env.AI_MAX_TOKENS ?? '1000')
    this.temperature = Number(env.AI_TEMPERATURE ?? '0.7')
  }

  async chat(messages: OpenAIChatMessage[]): Promise<string> {
    return this.request(messages)
  }

  async chatMultimodal(messages: OpenAIMultimodalChatMessage[]): Promise<string> {
    return this.request(messages)
  }

  private async request(messages: Array<OpenAIChatMessage | OpenAIMultimodalChatMessage>): Promise<string> {
    if (!this.baseURL || !this.apiKey || !this.model) {
      throw new AiClientError('config_missing', 'AI_BASE_URL, AI_API_KEY and AI_MODEL are required')
    }
    if (!Number.isFinite(this.timeout) || this.timeout <= 0) {
      throw new AiClientError('config_missing', 'AI_TIMEOUT must be a positive number')
    }
    if (!Number.isFinite(this.maxTokens) || this.maxTokens <= 0) {
      throw new AiClientError('config_missing', 'AI_MAX_TOKENS must be a positive number')
    }
    if (!Number.isFinite(this.temperature) || this.temperature < 0 || this.temperature > 2) {
      throw new AiClientError('config_missing', 'AI_TEMPERATURE must be between 0 and 2')
    }
    if (typeof fetch !== 'function') {
      throw new AiClientError(
        'config_missing',
        'AI runtime has no global fetch; set the cloud function runtime to Node 18+',
      )
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)

    try {
      const body: ChatCompletionParams = {
        model: this.model,
        messages,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        // 只读取状态码用于分类，不把供应商错误体（可能回显用户内容）写入日志
        throw this.classifyHttpError(response.status)
      }

      let data: ChatCompletionResponse
      try {
        data = (await response.json()) as ChatCompletionResponse
      } catch {
        throw new AiClientError('invalid_response', 'AI API returned a non-JSON response')
      }

      const content = data.choices?.[0]?.message?.content
      if (!content) {
        throw new AiClientError('invalid_response', 'AI API returned an empty response')
      }
      return content
    } catch (err) {
      if (err instanceof AiClientError) throw err
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AiClientError('timeout', `AI request timed out after ${this.timeout}ms`, undefined)
      }
      throw new AiClientError('provider', `AI request failed: ${err instanceof Error ? err.message : 'unknown error'}`)
    } finally {
      clearTimeout(timer)
    }
  }

  private classifyHttpError(status: number): AiClientError {
    if (status === 401 || status === 403) {
      return new AiClientError('config_missing', `AI API rejected credentials (HTTP ${status})`, status)
    }
    if (status === 402 || status === 429) {
      return new AiClientError('quota', `AI quota or rate limit exceeded (HTTP ${status})`, status)
    }
    return new AiClientError('provider', `AI API error (HTTP ${status})`, status)
  }
}
