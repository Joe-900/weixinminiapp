/**
 * @file AI 客户端本地假实现
 * @description 离线假回复，不发起任何网络请�?
 * 假回复回显关键上下文，以便断言上下文确实被正确拼装传入
 */

import type { AiClient } from '../interfaces/aiClient'
import type { OpenAIChatMessage } from '../../../src/types/ai'

export class MockAiClient implements AiClient {
  private shouldFail = false

  setFailMode(fail: boolean): void {
    this.shouldFail = fail
  }

  async chat(messages: OpenAIChatMessage[]): Promise<string> {
    if (this.shouldFail) {
      throw new Error('Mock AI client error')
    }

    const systemMsg = messages.find((m) => m.role === 'system')
    const userMsg = messages.find((m) => m.role === 'user')

    let bookTitle = '未知书籍'
    if (systemMsg) {
      const titleMatch = systemMsg.content.match(/书名[�?]\s*(.+)/)
      if (titleMatch) {
        bookTitle = titleMatch[1].trim()
      }
    }

    const question = userMsg?.content ?? ''
    return `已收到关于�?{bookTitle}》的问题�?{question}，这是本地模拟回复。`
  }
}
