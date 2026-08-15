import { noteMain } from './index'
import { getCloudRuntime, resolveCloudContext } from '../runtime/cloudRuntime'

export async function main(event: Parameters<typeof noteMain>[0], context: { OPENID?: string } = {}) {
  const { repo } = getCloudRuntime()
  return noteMain(event, resolveCloudContext(context), repo)
}
