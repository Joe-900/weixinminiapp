import type { ReservationProvider, ReservationAccountContext } from '../interfaces/reservationProvider'
import type { Book } from '../../../src/types/book'
import type { Availability, ReservationProviderResult } from '../../../src/types/reservation'

/** Safe local provider; no request is sent to a real library system. */
export class MockReservationProvider implements ReservationProvider {
  readonly name = 'mock-library'

  async queryAvailability(metadata: Book): Promise<Availability> {
    const unavailable = metadata.collectionStatus?.toLowerCase() === 'unavailable'
    return {
      bookId: metadata.bookId,
      available: !unavailable,
      location: metadata.location,
      message: unavailable ? 'No reservable copy in the local mock' : 'Mock copy is reservable',
    }
  }

  async reserve(metadata: Book, accountContext: ReservationAccountContext): Promise<ReservationProviderResult> {
    return {
      status: 'confirmed',
      externalId: `mock_${accountContext.openid}_${metadata.bookId}_${Date.now()}`,
      message: 'Local mock reservation confirmed; no real library request was sent',
    }
  }

  async cancel(reservationId: string, _accountContext: ReservationAccountContext): Promise<ReservationProviderResult> {
    return {
      status: 'cancelled',
      externalId: reservationId,
      message: 'Local mock reservation cancelled',
    }
  }
}
