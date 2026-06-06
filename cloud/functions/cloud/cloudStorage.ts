/**
 * @file 基于云存储的 Storage 实现
 * @description 线上模式使用微信云存储上传文�?
 * 需按官方最新文档核实：微信云开发存�?API
 */

import type { Storage } from '../interfaces/storage'

interface CloudStorageApi {
  uploadFile(params: { cloudPath: string; filePath: string }): Promise<{ fileID: string }>
  getTempFileURL(params: { fileList: string[] }): Promise<{ fileList: { tempFileURL: string }[] }>
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
    return res.fileList[0].tempFileURL
  }
}
