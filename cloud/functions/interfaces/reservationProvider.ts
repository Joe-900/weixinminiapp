import type { Book } from '../../../src/types/book'
import type { Availability, ReservationProviderResult } from '../../../src/types/reservation'

export interface ReservationAccountContext {
  openid: string
}

export interface ReservationProvider {
  readonly name: string
  queryAvailability(metadata: Book): Promise<Availability>
  reserve(metadata: Book, accountContext: ReservationAccountContext): Promise<ReservationProviderResult>
  cancel(reservationId: string, accountContext: ReservationAccountContext): Promise<ReservationProviderResult>
}
