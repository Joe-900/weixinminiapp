import { taskMain } from './index'
import { getCloudRuntime, resolveCloudContext } from '../runtime/cloudRuntime'

export async function main(event: Parameters<typeof taskMain>[0], context: { OPENID?: string } = {}) {
  const { repo } = getCloudRuntime()
  return taskMain(event, resolveCloudContext(context), repo)
}
