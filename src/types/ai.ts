/**
 * @file AI 伴读类型定义
 * @description ai_session 与 ai_message 集合的数据模型及请求/响应类型
 */

export type AiMessageRole = 'user' | 'assistant' | 'system'

export interface AiSession {
  _id: string
  sessionId: string
  openid: string
  bookId: string
  title: string
  createdAt: number
}

export interface AiMessage {
  _id: string
  msgId: string
  sessionId: string
  openid: string
  role: AiMessageRole
  content: string
  createdAt: number
}

export interface ChatParams {
  sessionId?: string
  bookId: string
  question: string
}

export interface ChatResult {
  reply: string
  sessionId: string
}

export interface OpenAIChatMessage {
  role: AiMessageRole
  content: string
}
