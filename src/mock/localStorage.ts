/**
 * @file Mock local storage for frontend local mode
 * @description Returns simulated fileID
 */

export class LocalStorage {
  async upload(_filePath: string, cloudPath: string): Promise<string> {
    const randomSuffix = Math.random().toString(36).substring(2, 10)
    return `local-mock://cover/${cloudPath}_${randomSuffix}`
  }

  async getTempFileURL(fileID: string): Promise<string> {
    return fileID
  }
}
