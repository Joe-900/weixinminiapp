/**
 * @file 预约状态管理
 */

import { create } from 'zustand'
import type { Reservation, Book, Campus, PickupLocation } from '../types/reservation'

interface ReservationState {
  reservations: Reservation[]
  books: Book[]
  campuses: Campus[]
  pickupLocations: PickupLocation[]
  currentBook: Book | null
  setReservations: (reservations: Reservation[]) => void
  addReservation: (reservation: Reservation) => void
  updateReservation: (reservationId: string, updates: Partial<Reservation>) => void
  deleteReservation: (reservationId: string) => void
  setBooks: (books: Book[]) => void
  setCurrentBook: (book: Book | null) => void
  setCampuses: (campuses: Campus[]) => void
  setPickupLocations: (locations: PickupLocation[]) => void
}

export const useReservationStore = create<ReservationState>((set) => ({
  reservations: [],
  books: [],
  campuses: [
    { id: 'campus_001', name: '校本部', address: '北京市海淀区学院路15号' },
    { id: 'campus_002', name: '西校区', address: '北京市海淀区西三环北路105号' },
    { id: 'campus_003', name: '东校区', address: '北京市朝阳区望京街9号' },
  ],
  pickupLocations: [
    { id: 'pickup_001', name: '图书馆一楼借书处', campus: 'campus_001' },
    { id: 'pickup_002', name: '图书馆二楼借书处', campus: 'campus_001' },
    { id: 'pickup_003', name: '西校区分馆', campus: 'campus_002' },
    { id: 'pickup_004', name: '东校区分馆', campus: 'campus_003' },
  ],
  currentBook: null,

  setReservations: (reservations) => set({ reservations }),

  addReservation: (reservation) =>
    set((state) => ({ reservations: [...state.reservations, reservation] })),

  updateReservation: (reservationId, updates) =>
    set((state) => ({
      reservations: state.reservations.map((r) =>
        r.reservationId === reservationId ? { ...r, ...updates, updatedAt: Date.now() } : r
      ),
    })),

  deleteReservation: (reservationId) =>
    set((state) => ({
      reservations: state.reservations.filter((r) => r.reservationId !== reservationId),
    })),

  setBooks: (books) => set({ books }),

  setCurrentBook: (book) => set({ currentBook: book }),

  setCampuses: (campuses) => set({ campuses }),

  setPickupLocations: (locations) => set({ pickupLocations }),
}))
