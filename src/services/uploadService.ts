/**
 * @file Cover upload service
 * @description Upload cover image to cloud storage, return fileID
 * Local mock mode returns simulated fileID
 */

import Taro from '@tarojs/taro'
import { CURRENT_MODE } from '../types/config'
import { getMockDeps } from './mockBridge'

export async function uploadCover(filePath: string): Promise<string> {
  if (CURRENT_MODE === 'local') {
    const { storage } = getMockDeps() as { storage: { upload: (filePath: string, cloudPath: string) => Promise<string> } }
    const cloudPath = `covers/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`
    return storage.upload(filePath, cloudPath)
  }

  const uploadRes = await Taro.cloud.uploadFile({
    cloudPath: `covers/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`,
    filePath,
  })

  return uploadRes.fileID
}
