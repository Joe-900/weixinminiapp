/**
 * @file 基于 OpenAI 兼容格式的 AIClient 实现
 * @description 线上模式走 OpenAI 兼容接口（默认对接 DeepSeek）
 * baseURL、key、model 名称全部从云函数环境变量读取
 */

import type { AiClient } from '../interfaces/aiClient'
import type { OpenAIChatMessage } from '../../src/types/ai'

interface ChatCompletionParams {
  model: string
  messages: OpenAIChatMessage[]
  max_tokens?: number
  temperature?: number
}

interface ChatCompletionResponse {
  choices: { message: { content: string } }[]
}

export class OpenAiClient implements AiClient {
  private baseURL: string
  private apiKey: string
  private model: string
  private timeout: number

  constructor(env: Record<string, string | undefined>) {
    this.baseURL = env.AI_BASE_URL ?? ''
    this.apiKey = env.AI_API_KEY ?? ''
    this.model = env.AI_MODEL ?? 'deepseek-chat'
    this.timeout = Number(env.AI_TIMEOUT ?? '30000')
  }

  async chat(messages: OpenAIChatMessage[]): Promise<string> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeout)

    try {
      const body: ChatCompletionParams = {
        model: this.model,
        messages,
        max_tokens: 1000,
        temperature: 0.7,
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
      return data.choices[0].message.content
    } finally {
      clearTimeout(timer)
    }
  }
}
