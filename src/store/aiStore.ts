/**
 * @file AI state management
 * @description Zustand store for AI sessions and messages
 */

import { create } from 'zustand'
import type { AiSession, AiMessage } from '../types/ai'

interface AiState {
  currentSessionId: string
  sessions: AiSession[]
  messages: AiMessage[]
  loading: boolean
  setCurrentSession: (sessionId: string) => void
  setSessions: (sessions: AiSession[]) => void
  setMessages: (messages: AiMessage[]) => void
  addMessage: (message: AiMessage) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useAiStore = create<AiState>((set) => ({
  currentSessionId: '',
  sessions: [],
  messages: [],
  loading: false,

  setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),

  setSessions: (sessions) => set({ sessions }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  setLoading: (loading) => set({ loading }),

  reset: () => set({ currentSessionId: '', sessions: [], messages: [], loading: false }),
}))
