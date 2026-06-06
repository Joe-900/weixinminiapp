/**
 * @file Note/Checkin state management
 * @description Zustand store for notes and checkin stats
 */

import { create } from 'zustand'
import type { Note, CheckinStat } from '../types/note'

interface NoteState {
  notes: Note[]
  total: number
  page: number
  stat: CheckinStat
  loading: boolean
  setNotes: (notes: Note[], total: number, page: number) => void
  setStat: (stat: CheckinStat) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

export const useNoteStore = create<NoteState>((set) => ({
  notes: [],
  total: 0,
  page: 1,
  stat: { streakDays: 0, totalMinutes: 0 },
  loading: false,

  setNotes: (notes, total, page) => set({ notes, total, page }),
  setStat: (stat) => set({ stat }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ notes: [], total: 0, page: 1, stat: { streakDays: 0, totalMinutes: 0 } }),
}))
