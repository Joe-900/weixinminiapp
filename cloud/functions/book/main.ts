import { bookMain } from './index'
import { getCloudRuntime, resolveCloudContext } from '../runtime/cloudRuntime'

export async function main(event: Parameters<typeof bookMain>[0], context: { OPENID?: string } = {}) {
  const { repo } = getCloudRuntime()
  return bookMain(event, resolveCloudContext(context), repo)
}
