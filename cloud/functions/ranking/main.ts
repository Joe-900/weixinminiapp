import { rankingMain } from './index'
import { getCloudRuntime, resolveCloudContext } from '../runtime/cloudRuntime'

export async function main(event: Parameters<typeof rankingMain>[0], context: { OPENID?: string } = {}) {
  const { repo } = getCloudRuntime()
  return rankingMain(event, resolveCloudContext(context), repo)
}
