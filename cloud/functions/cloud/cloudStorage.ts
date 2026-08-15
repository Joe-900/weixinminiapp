/**
 * 基于微信云存储的 Storage 实现。
 */

import type { Storage } from '../interfaces/storage'

interface CloudStorageApi {
  uploadFile(params: { cloudPath: string; filePath: string }): Promise<{ fileID: string }>
  getTempFileURL(params: { fileList: string[] }): Promise<{
    fileList: Array<{ fileID: string; tempFileURL: string; status: number }>
  }>
}

export class CloudStorage implements Storage {
  private storage: CloudStorageApi

  constructor(storage: CloudStorageApi) {
    this.storage = storage
  }

  async upload(filePath: string, cloudPath: string): Promise<string> {
    const res = await this.storage.uploadFile({ cloudPath, filePath })
    return res.fileID
  }

  async getTempFileURL(fileID: string): Promise<string> {
    const res = await this.storage.getTempFileURL({ fileList: [fileID] })
    const first = res.fileList[0]
    if (!first || first.status !== 0 || !first.tempFileURL) {
      throw new Error(`Unable to resolve cloud file URL: ${fileID}`)
    }
    return first.tempFileURL
  }
}
