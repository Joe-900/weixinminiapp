/**
 * @file Mock AI client implementation
 * @description Offline fake replies, no network requests
 * Fake reply echoes key context so assertions can verify context assembly
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

    let bookTitle = 'Unknown Book'
    if (systemMsg) {
      const titleMatch = systemMsg.content.match(/"([^"]+)"/)
      if (titleMatch) {
        bookTitle = titleMatch[1]
      }
    }

    const questionText = userMsg?.content ?? ''
    return `Received question about "${bookTitle}": ${questionText}. This is a local mock reply.`
  }
}
