/**
 * @file AI 客户端分类错误
 * @description 供应商适配层抛出的统一错误分类，由 aiService 映射为平台统一错误码。
 * 不携带 API Key、不携带请求体，避免敏感信息进入日志。
 */

export type AiClientErrorKind =
  | 'config_missing'
  | 'timeout'
  | 'quota'
  | 'provider'
  | 'invalid_response'

export class AiClientError extends Error {
  readonly kind: AiClientErrorKind
  /** 供应商 HTTP 状态码（若有），仅用于排查，不包含响应体内容 */
  readonly status?: number

  constructor(kind: AiClientErrorKind, message: string, status?: number) {
    super(message)
    this.name = 'AiClientError'
    this.kind = kind
    this.status = status
  }
}
