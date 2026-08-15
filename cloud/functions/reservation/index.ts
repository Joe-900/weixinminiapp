import type { Repository } from '../interfaces/repository'
import type { ReservationProvider } from '../interfaces/reservationProvider'
import type { ApiResponse } from '../../../src/types/common'
import { authenticate } from '../common/auth'
import { ErrorCode } from '../../../src/types/common'
import { fail } from '../common/response'
import { validateParams } from '../common/validate'
import {
  handleAvailability,
  handleCancelReservation,
  handleListReservations,
  handleReserve,
} from './reservationService'

interface ReservationEvent {
  action?: string
  bookId?: string
  reservationId?: string
  [key: string]: unknown
}

export async function reservationMain(
  event: ReservationEvent,
  context: { OPENID?: string },
  repo: Repository,
  provider: ReservationProvider,
): Promise<ApiResponse<unknown>> {
  const actionError = validateParams(event, [{ name: 'action', type: 'string', required: true }])
  if (actionError) return actionError
  const openid = context.OPENID ?? ''
  const authResult = await authenticate(repo, openid)
  if (authResult.error) return authResult.error

  switch (event.action) {
    case 'availability':
      return handleAvailability(repo, provider, event.bookId ?? '')
    case 'reserve':
      return handleReserve(repo, provider, openid, event.bookId ?? '')
    case 'cancel':
      return handleCancelReservation(repo, provider, openid, event.reservationId ?? '')
    case 'list':
      return handleListReservations(repo, openid)
    default:
      return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${event.action}`)
  }
}
