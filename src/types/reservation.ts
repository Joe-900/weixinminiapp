export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled' | 'failed'

export interface Reservation {
  _id: string
  reservationId: string
  openid: string
  bookId: string
  provider: string
  status: ReservationStatus
  externalId?: string
  message?: string
  createdAt: number
  updatedAt: number
}

export interface Availability {
  bookId: string
  available: boolean
  location?: string
  message?: string
}

export interface ReservationProviderResult {
  status: ReservationStatus
  externalId?: string
  message?: string
}
