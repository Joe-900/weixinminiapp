import { readingMain } from './index'
import { getCloudRuntime, resolveCloudContext } from '../runtime/cloudRuntime'

export async function main(event: Parameters<typeof readingMain>[0], context: { OPENID?: string } = {}) {
  const { repo } = getCloudRuntime()
  return readingMain(event, resolveCloudContext(context), repo)
}
