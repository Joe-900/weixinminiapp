import { userMain } from './index'
import { getCloudRuntime, resolveCloudContext } from '../runtime/cloudRuntime'

export async function main(event: Parameters<typeof userMain>[0], context: { OPENID?: string } = {}) {
  const { repo } = getCloudRuntime()
  return userMain(event, resolveCloudContext(context), repo)
}
