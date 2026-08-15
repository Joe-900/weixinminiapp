import { CloudRepository } from '../cloud/cloudRepository'
import { CloudStorage } from '../cloud/cloudStorage'
import { OpenAiClient } from '../cloud/openaiAiClient'
import { MockReservationProvider } from '../mock/mockReservationProvider'

interface CloudSdk {
  DYNAMIC_CURRENT_ENV?: string
  init(options?: { env?: string }): void
  database(): unknown
  getWXContext(): { OPENID?: string }
  uploadFile(params: { cloudPath: string; filePath: string }): Promise<{ fileID: string }>
  getTempFileURL(params: { fileList: string[] }): Promise<{
    fileList: Array<{ fileID: string; tempFileURL: string; status: number }>
  }>
}

let runtime: ReturnType<typeof initializeRuntime> | null = null

function initializeRuntime() {
  // wx-server-sdk is supplied by each deployed CloudBase function package.
  // A dynamic require keeps local Jest and the Taro frontend independent of it.
  const cloud = require('wx-server-sdk') as CloudSdk
  cloud.init({ env: process.env.CLOUD_ENV_ID || cloud.DYNAMIC_CURRENT_ENV })
  return {
    cloud,
    repo: new CloudRepository(cloud.database() as ConstructorParameters<typeof CloudRepository>[0]),
    storage: new CloudStorage(cloud as ConstructorParameters<typeof CloudStorage>[0]),
    aiClient: new OpenAiClient(process.env),
    reservationProvider: new MockReservationProvider(),
  }
}

export function getCloudRuntime(): ReturnType<typeof initializeRuntime> {
  if (!runtime) runtime = initializeRuntime()
  return runtime
}

export function resolveCloudContext(context?: { OPENID?: string }): { OPENID?: string } {
  if (context?.OPENID) return { OPENID: context.OPENID }
  const { cloud } = getCloudRuntime()
  return { OPENID: cloud.getWXContext().OPENID }
}
