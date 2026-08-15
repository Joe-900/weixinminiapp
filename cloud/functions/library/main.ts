import { libraryMain } from './index'
import { getCloudRuntime, resolveCloudContext } from '../runtime/cloudRuntime'

export async function main(event: Parameters<typeof libraryMain>[0], context: { OPENID?: string } = {}) {
  const { repo } = getCloudRuntime()
  return libraryMain(event, resolveCloudContext(context), repo)
}
