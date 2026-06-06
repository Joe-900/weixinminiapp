/**
 * @file AI 客户端抽象接口（AIClient�?
 * @description 定义大模型调用的抽象接口
 * 线上实现�?OpenAI 兼容接口，本地实现为离线假回�?
 */

import type { OpenAIChatMessage } from '../../../src/types/ai'

export interface AiClient {
  chat(messages: OpenAIChatMessage[]): Promise<string>
}
