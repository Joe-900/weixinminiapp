/**
 * @file Mock AI client for frontend local mode
 * @description Returns fake replies without network requests
 */

import type { OpenAIChatMessage, OpenAIMultimodalChatMessage } from '../types/ai'

export class MockAiClient {
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
    const systemContent = typeof systemMsg?.content === 'string' ? systemMsg.content : ''
    const titleMatch = systemContent.match(/title:\s*([^;]+)/i) ?? systemContent.match(/"([^"]+)"/)
      if (titleMatch) bookTitle = titleMatch[1]
    }
    const questionText = typeof userMsg?.content === 'string' ? userMsg.content : '[图片提问]'
    return `关于《${bookTitle}》的问题：${questionText}。这是本地模拟回复。`
  }

  async chatMultimodal(messages: OpenAIMultimodalChatMessage[]): Promise<string> {
    const textMessages: OpenAIChatMessage[] = messages.map((message) => ({
      role: message.role,
      content: typeof message.content === 'string'
        ? message.content
        : message.content.filter((part) => part.type === 'text').map((part) => part.text).join('\n'),
    }))
    const reply = await this.chat(textMessages)
    return `${reply} 已收到图片上下文。`
  }
}
