/**
 * @file Cover upload service
 * @description Upload cover image to cloud storage, return fileID
 * Local mock mode returns simulated fileID
 */

import Taro from '@tarojs/taro'
import { CURRENT_MODE } from '../types/config'
import { getMockDeps } from './mockBridge'
import type { AiImageInput } from '../types/ai'

async function uploadFile(filePath: string, cloudPath: string): Promise<string> {
  if (CURRENT_MODE === 'local') {
    const { storage } = getMockDeps() as {
      storage: { upload: (path: string, target: string) => Promise<string> }
    }
    return storage.upload(filePath, cloudPath)
  }

  const uploadRes = await Taro.cloud.uploadFile({ cloudPath, filePath })
  return uploadRes.fileID
}

export async function uploadCover(filePath: string): Promise<string> {
  const cloudPath = `covers/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.png`
  return uploadFile(filePath, cloudPath)
}

export async function uploadAiImage(filePath: string, mimeType = 'image/jpeg'): Promise<AiImageInput> {
  const extension = mimeType === 'image/png' ? 'png' : 'jpg'
  const cloudPath = `ai-images/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`
  const fileId = await uploadFile(filePath, cloudPath)
  return { fileId, mimeType, name: cloudPath.split('/').pop() }
}
