import { callFunction } from './request'
import type { ApiResponse } from '../types/common'
import type { Availability, Reservation } from '../types/reservation'

export function queryAvailability(bookId: string): Promise<ApiResponse<Availability>> {
  return callFunction({ name: 'reservation', data: { action: 'availability', bookId } })
}

export function reserveBook(bookId: string): Promise<ApiResponse<Reservation>> {
  return callFunction({ name: 'reservation', data: { action: 'reserve', bookId } })
}

export function cancelReservation(reservationId: string): Promise<ApiResponse<Reservation>> {
  return callFunction({ name: 'reservation', data: { action: 'cancel', reservationId } })
}

export function listReservations(): Promise<ApiResponse<Reservation[]>> {
  return callFunction({ name: 'reservation', data: { action: 'list' } })
}
