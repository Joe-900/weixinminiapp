/**
 * @file Mock AI client implementation
 * @description Offline fake replies, no network requests
 * Fake reply echoes key context so assertions can verify context assembly
 */

import type { AiClient } from '../interfaces/aiClient'
import type { OpenAIChatMessage, OpenAIMultimodalChatMessage } from '../../../src/types/ai'

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

    let bookTitle = 'Unknown Book'
    if (systemMsg) {
      const systemContent = typeof systemMsg.content === 'string' ? systemMsg.content : ''
      const titleMatch = systemContent.match(/title:\s*([^;]+)/i) ?? systemContent.match(/"([^"]+)"/)
      if (titleMatch) {
        bookTitle = titleMatch[1]
      }
    }

    const questionText = typeof userMsg?.content === 'string' ? userMsg.content : '[image question]'
    return `Received question about "${bookTitle}": ${questionText}. This is a local mock reply.`
  }

  async chatMultimodal(messages: OpenAIMultimodalChatMessage[]): Promise<string> {
    const textMessages: OpenAIChatMessage[] = messages.map((message) => ({
      role: message.role,
      content: typeof message.content === 'string'
        ? message.content
        : message.content.filter((part) => part.type === 'text').map((part) => part.text).join('\n'),
    }))
    const reply = await this.chat(textMessages)
    return `${reply} Image context received.`
  }
}
