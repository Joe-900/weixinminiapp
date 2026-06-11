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
    { id: 'shahe', name: '沙河校区', address: '北京市昌平区沙河高教园' },
    { id: 'xitu', name: '西土城校区', address: '北京市海淀区学院路15号' },
  ],
  pickupLocations: [
    { id: 'pickup_shahe_1', name: '沙河校区图书馆', campus: 'shahe' },
    { id: 'pickup_shahe_2', name: '沙河校区第二借阅室', campus: 'shahe' },
    { id: 'pickup_xitu_1', name: '西土城校区图书馆', campus: 'xitu' },
    { id: 'pickup_xitu_2', name: '西土城校区理科馆', campus: 'xitu' },
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
