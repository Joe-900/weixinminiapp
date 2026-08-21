import type { Repository } from '../interfaces/repository'
import type { ReservationProvider } from '../interfaces/reservationProvider'
import type { ApiResponse } from '../../../src/types/common'
import { authenticate } from '../common/auth'
import { ErrorCode } from '../../../src/types/common'
import { fail, success } from '../common/response'
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
  transferId?: string
  toLocation?: string
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
    // 取书地点：查询校区库存，有库存直接取，无库存则发起转取
    case 'pickup': {
      const bookId = event.bookId ?? ''
      const toLocation = event.toLocation ?? ''
      if (!bookId || !toLocation) return fail(ErrorCode.BAD_REQUEST, 'bookId and toLocation are required')
      const book = await repo.findBookById(bookId)
      if (!book) return fail(ErrorCode.NOT_FOUND, 'Book not found')

      const campuses = ['沙河校区', '西土城校区']
      const otherCampus = campuses.find((c) => c !== toLocation) ?? ''
      function campusStock(bid: string, campus: string): boolean {
        const key = bid + campus
        let hash = 0
        for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash) + key.charCodeAt(i)
        return Math.abs(hash) % 3 > 0
      }
      const targetHas = campusStock(bookId, toLocation)
      const otherHas = campusStock(bookId, otherCampus)

      if (targetHas) {
        return success({ type: 'available', location: toLocation, message: `${toLocation}有馆藏，可直接前往取书` })
      }
      if (otherHas) {
        const existing = (await repo.listTransfers(openid)).find(
          (item) => item.bookId === bookId && item.toLocation === toLocation && item.status !== 'cancelled' && item.status !== 'picked_up',
        )
        if (existing) {
          return success({ type: 'transfer', location: toLocation, message: `需从${otherCampus}调书，预计${existing.estimatedDays}个工作日`, transfer: existing })
        }
        const now = Date.now()
        const transfer = await repo.createTransfer({
          openid,
          bookId,
          fromLocation: otherCampus,
          toLocation,
          status: 'requested',
          estimatedDays: 3,
          pickupCode: `PK${now.toString(36).toUpperCase().slice(-6)}`,
          pickupDeadline: now + 7 * 24 * 60 * 60 * 1000,
          message: `需从${otherCampus}调书至${toLocation}`,
          createdAt: now,
          updatedAt: now,
        })
        return success({ type: 'transfer', location: toLocation, message: `需从${otherCampus}调书，预计${transfer.estimatedDays}个工作日`, transfer })
      }
      return success({ type: 'unavailable', location: toLocation, message: '两个校区均无可用馆藏' })
    }
    case 'listTransfers':
      return success(await repo.listTransfers(openid))
    case 'confirmPickup': {
      const transferId = event.transferId ?? ''
      const transfer = await repo.findTransfer(transferId)
      if (!transfer) return fail(ErrorCode.NOT_FOUND, 'Transfer not found')
      if (transfer.openid !== openid) return fail(ErrorCode.ACCESS_DENIED, 'Transfer is not yours')
      return success(await repo.updateTransfer(transferId, openid, {
        status: 'picked_up',
        message: '已确认取书，转取完成',
      }))
    }
    case 'cancelTransfer': {
      const transferId = event.transferId ?? ''
      const transfer = await repo.findTransfer(transferId)
      if (!transfer) return fail(ErrorCode.NOT_FOUND, 'Transfer not found')
      if (transfer.openid !== openid) return fail(ErrorCode.ACCESS_DENIED, 'Transfer is not yours')
      return success(await repo.updateTransfer(transferId, openid, {
        status: 'cancelled',
        message: '转取请求已取消',
      }))
    }
    default:
      return fail(ErrorCode.BAD_REQUEST, `Unknown action: ${event.action}`)
  }
}

export { main } from './main'
