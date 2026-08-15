import { aiMain } from './index'
import { getCloudRuntime, resolveCloudContext } from '../runtime/cloudRuntime'

export async function main(event: Parameters<typeof aiMain>[0], context: { OPENID?: string } = {}) {
  const { repo, aiClient, storage } = getCloudRuntime()
  return aiMain(event, resolveCloudContext(context), repo, aiClient, process.env, storage)
}
