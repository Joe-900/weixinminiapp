/**
 * @file 预约服务层
 */

import { callFunction } from './request'
import type { ApiResponse, PaginatedData } from '../types/common'
import type { Reservation, Book, ReservationCreateParams, ReservationSearchParams } from '../types/reservation'

export async function searchBooks(params: ReservationSearchParams): Promise<ApiResponse<PaginatedData<Book>>> {
  return callFunction<PaginatedData<Book>>({
    name: 'reservation',
    data: { action: 'searchBooks', ...params },
  })
}

export async function getBookDetail(bookId: string): Promise<ApiResponse<Book>> {
  return callFunction<Book>({
    name: 'reservation',
    data: { action: 'getBookDetail', bookId },
  })
}

export async function checkBookStatus(bookId: string): Promise<ApiResponse<{
  status: string
  reservationType: string
  estimatedTime: string
  position?: number
}>> {
  return callFunction({
    name: 'reservation',
    data: { action: 'checkBookStatus', bookId },
  })
}

export async function createReservation(params: ReservationCreateParams): Promise<ApiResponse<Reservation>> {
  return callFunction<Reservation>({
    name: 'reservation',
    data: { action: 'createReservation', ...params },
  })
}

export async function getMyReservations(): Promise<ApiResponse<PaginatedData<Reservation>>> {
  return callFunction<PaginatedData<Reservation>>({
    name: 'reservation',
    data: { action: 'getMyReservations' },
  })
}

export async function getReservationDetail(reservationId: string): Promise<ApiResponse<Reservation>> {
  return callFunction<Reservation>({
    name: 'reservation',
    data: { action: 'getReservationDetail', reservationId },
  })
}

export async function cancelReservation(reservationId: string): Promise<ApiResponse<string>> {
  return callFunction<string>({
    name: 'reservation',
    data: { action: 'cancelReservation', reservationId },
  })
}

export async function getAllReservations(params?: {
  type?: string
  status?: string
  page?: number
  pageSize?: number
}): Promise<ApiResponse<PaginatedData<Reservation>>> {
  return callFunction<PaginatedData<Reservation>>({
    name: 'reservation',
    data: { action: 'getAllReservations', ...params },
  })
}

export async function confirmReservation(reservationId: string): Promise<ApiResponse<string>> {
  return callFunction<string>({
    name: 'reservation',
    data: { action: 'confirmReservation', reservationId },
  })
}

export async function rejectReservation(reservationId: string, reason: string): Promise<ApiResponse<string>> {
  return callFunction<string>({
    name: 'reservation',
    data: { action: 'rejectReservation', reservationId, reason },
  })
}

export async function completeReservation(reservationId: string): Promise<ApiResponse<string>> {
  return callFunction<string>({
    name: 'reservation',
    data: { action: 'completeReservation', reservationId },
  })
}
