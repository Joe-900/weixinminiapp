import { reservationMain } from './index'
import { getCloudRuntime, resolveCloudContext } from '../runtime/cloudRuntime'

export async function main(event: Parameters<typeof reservationMain>[0], context: { OPENID?: string } = {}) {
  const { repo, reservationProvider } = getCloudRuntime()
  return reservationMain(event, resolveCloudContext(context), repo, reservationProvider)
}
