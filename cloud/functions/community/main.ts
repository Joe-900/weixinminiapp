import { communityMain } from './index'
import { getCloudRuntime, resolveCloudContext } from '../runtime/cloudRuntime'

export async function main(event: Parameters<typeof communityMain>[0], context: { OPENID?: string } = {}) {
  const { repo } = getCloudRuntime()
  return communityMain(event, resolveCloudContext(context), repo)
}
