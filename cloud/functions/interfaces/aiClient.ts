/**
 * AI 客户端抽象接口。
 */

import type { OpenAIChatMessage, OpenAIMultimodalChatMessage } from '../../../src/types/ai'

export interface AiClient {
  chat(messages: OpenAIChatMessage[]): Promise<string>
  chatMultimodal?(messages: OpenAIMultimodalChatMessage[]): Promise<string>
  configure?(env: Record<string, string | undefined>): AiClient
}
