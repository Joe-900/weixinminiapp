/**
 * 文件存储抽象接口。
 */

export interface Storage {
  upload(filePath: string, cloudPath: string): Promise<string>
  getTempFileURL(fileID: string): Promise<string>
}
