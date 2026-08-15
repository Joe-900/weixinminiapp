import type { Repository } from '../interfaces/repository'
import type { ReservationProvider } from '../interfaces/reservationProvider'
import type { ApiResponse } from '../../../src/types/common'
import type { Availability, Reservation } from '../../../src/types/reservation'
import { ErrorCode } from '../../../src/types/common'
import { fail, success } from '../common/response'

export async function handleAvailability(
  repo: Repository,
  provider: ReservationProvider,
  bookId: string,
): Promise<ApiResponse<Availability>> {
  if (!bookId) return fail(ErrorCode.BAD_REQUEST, 'bookId is required')
  const book = await repo.findBookById(bookId)
  if (!book) return fail(ErrorCode.NOT_FOUND, 'Book not found')
  return success(await provider.queryAvailability(book))
}

export async function handleReserve(
  repo: Repository,
  provider: ReservationProvider,
  openid: string,
  bookId: string,
): Promise<ApiResponse<Reservation>> {
  if (!bookId) return fail(ErrorCode.BAD_REQUEST, 'bookId is required')
  const book = await repo.findBookById(bookId)
  if (!book) return fail(ErrorCode.NOT_FOUND, 'Book not found')

  const existing = (await repo.listReservations(openid)).find(
    (item) => item.bookId === bookId && (item.status === 'pending' || item.status === 'confirmed'),
  )
  if (existing) return success(existing)

  const availability = await provider.queryAvailability(book)
  if (!availability.available) return fail(ErrorCode.BAD_REQUEST, availability.message ?? 'Book is unavailable')
  const providerResult = await provider.reserve(book, { openid })
  const now = Date.now()
  return success(await repo.createReservation({
    openid,
    bookId,
    provider: provider.name,
    status: providerResult.status,
    externalId: providerResult.externalId,
    message: providerResult.message,
    createdAt: now,
    updatedAt: now,
  }))
}

export async function handleCancelReservation(
  repo: Repository,
  provider: ReservationProvider,
  openid: string,
  reservationId: string,
): Promise<ApiResponse<Reservation>> {
  if (!reservationId) return fail(ErrorCode.BAD_REQUEST, 'reservationId is required')
  const reservation = await repo.findReservation(reservationId)
  if (!reservation) return fail(ErrorCode.NOT_FOUND, 'Reservation not found')
  if (reservation.openid !== openid) return fail(ErrorCode.ACCESS_DENIED, 'Reservation is not yours')
  if (reservation.status === 'cancelled') return success(reservation)

  const providerResult = await provider.cancel(reservation.externalId ?? reservation.reservationId, { openid })
  return success(await repo.updateReservation(reservation.reservationId, openid, {
    status: providerResult.status,
    message: providerResult.message,
    externalId: providerResult.externalId ?? reservation.externalId,
  }))
}

export async function handleListReservations(
  repo: Repository,
  openid: string,
): Promise<ApiResponse<Reservation[]>> {
  return success(await repo.listReservations(openid))
}
