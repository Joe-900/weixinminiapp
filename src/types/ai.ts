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
  imageFileId?: string
  createdAt: number
}

export interface BookContextInput {
  title: string
  author?: string
  edition?: string
  isbn?: string
}

export interface AiImageInput {
  fileId: string
  mimeType: string
  name?: string
}

export interface ChatParams {
  sessionId?: string
  bookId?: string
  book?: BookContextInput
  question: string
  context?: string
  image?: AiImageInput
}

export interface ChatResult {
  reply: string
  sessionId: string
  usedImage?: boolean
  uncertainty?: string
}

export interface OpenAITextContentPart {
  type: 'text'
  text: string
}

export interface OpenAIImageContentPart {
  type: 'image_url'
  image_url: { url: string; detail?: 'auto' | 'low' | 'high' }
}

export type OpenAIContentPart = OpenAITextContentPart | OpenAIImageContentPart

export interface OpenAIChatMessage {
  role: AiMessageRole
  content: string
}

export interface OpenAIMultimodalChatMessage {
  role: AiMessageRole
  content: string | OpenAIContentPart[]
}
