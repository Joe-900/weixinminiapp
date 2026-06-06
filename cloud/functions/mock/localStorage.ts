/**
 * @file 本地文件存储实现
 * @description 返回模拟 fileID，不真正上传文件
 */

import type { Storage } from '../interfaces/storage'

export class LocalStorage implements Storage {
  async upload(_filePath: string, cloudPath: string): Promise<string> {
    const randomSuffix = Math.random().toString(36).substring(2, 10)
    return `local-mock://cover/${cloudPath}_${randomSuffix}`
  }

  async getTempFileURL(fileID: string): Promise<string> {
    return fileID
  }
}
