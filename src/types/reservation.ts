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

// 转取（跨校区调书取书）功能
export type TransferStatus = 'requested' | 'in_transit' | 'arrived' | 'picked_up' | 'cancelled'

export interface BookTransfer {
  _id: string
  transferId: string
  openid: string
  bookId: string
  fromLocation: string
  toLocation: string
  status: TransferStatus
  estimatedDays: number
  pickupCode?: string
  pickupDeadline?: number
  message?: string
  createdAt: number
  updatedAt: number
}

// 取书地点查询结果
export interface PickupResult {
  type: 'available' | 'transfer' | 'unavailable'
  message: string
  location: string
  transfer?: BookTransfer
}
