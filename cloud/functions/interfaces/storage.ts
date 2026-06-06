/**
 * @file 文件存储抽象接口（Storage）
 * @description 定义文件上传与获取链接的抽象接口
 * 线上实现基于云存储，本地实现返回模拟 fileID
 */

export interface Storage {
  upload(filePath: string, cloudPath: string): Promise<string>
  getTempFileURL(fileID: string): Promise<string>
}
