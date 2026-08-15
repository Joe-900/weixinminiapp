/**
 * OpenAI 兼容协议 AIClient 实现。
 */

import type { AiClient } from '../interfaces/aiClient'
import type { OpenAIChatMessage, OpenAIMultimodalChatMessage } from '../../../src/types/ai'

interface ChatCompletionParams {
  model: string
  messages: Array<OpenAIChatMessage | OpenAIMultimodalChatMessage>
  max_tokens?: number
  temperature?: number
}

interface ChatCompletionResponse {
  choices: Array<{ message: { content: string | null } }>
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
      throw new Error('AI_BASE_URL, AI_API_KEY and AI_MODEL are required')
    }
    if (!Number.isFinite(this.timeout) || this.timeout <= 0) {
      throw new Error('AI_TIMEOUT must be a positive number')
    }
    if (!Number.isFinite(this.maxTokens) || this.maxTokens <= 0) {
      throw new Error('AI_MAX_TOKENS must be a positive number')
    }
    if (!Number.isFinite(this.temperature) || this.temperature < 0 || this.temperature > 2) {
      throw new Error('AI_TEMPERATURE must be between 0 and 2')
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
        throw new Error(`AI API error: ${response.status}`)
      }

      const data = (await response.json()) as ChatCompletionResponse
      const content = data.choices[0]?.message.content
      if (!content) {
        throw new Error('AI API returned an empty response')
      }
      return content
    } finally {
      clearTimeout(timer)
    }
  }
}
