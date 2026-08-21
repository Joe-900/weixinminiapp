import { callFunction } from './request'
import type { ApiResponse } from '../types/common'
import type { Availability, BookTransfer, PickupResult, Reservation } from '../types/reservation'

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

// 取书地点：查询校区库存，有库存直接取，无库存则发起转取
export function requestPickup(bookId: string, toLocation: string): Promise<ApiResponse<PickupResult>> {
  return callFunction({ name: 'reservation', data: { action: 'pickup', bookId, toLocation } })
}

export function listTransfers(): Promise<ApiResponse<BookTransfer[]>> {
  return callFunction({ name: 'reservation', data: { action: 'listTransfers' } })
}

export function confirmPickup(transferId: string): Promise<ApiResponse<BookTransfer>> {
  return callFunction({ name: 'reservation', data: { action: 'confirmPickup', transferId } })
}

export function cancelTransfer(transferId: string): Promise<ApiResponse<BookTransfer>> {
  return callFunction({ name: 'reservation', data: { action: 'cancelTransfer', transferId } })
}
