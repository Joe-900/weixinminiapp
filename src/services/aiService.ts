/**
 * @file AI domain frontend service layer
 * @description Frontend cloud function call wrapper for AI domain
 */

import { callFunction } from './request'
import type { ApiResponse } from '../types/common'
import type { AiSession, AiMessage, ChatParams, ChatResult } from '../types/ai'

export async function aiChat(params: ChatParams): Promise<ApiResponse<ChatResult>> {
  return callFunction<ChatResult>({
    name: 'ai',
    data: { action: 'chat', ...params },
  })
}

export async function aiLoadHistory(sessionId: string, limit?: number): Promise<ApiResponse<AiMessage[]>> {
  return callFunction<AiMessage[]>({
    name: 'ai',
    data: { action: 'loadHistory', sessionId, limit },
  })
}

export async function aiListSessions(): Promise<ApiResponse<AiSession[]>> {
  return callFunction<AiSession[]>({
    name: 'ai',
    data: { action: 'listSessions' },
  })
}
