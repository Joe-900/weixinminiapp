import type {
  AiProviderConfig,
  AiProviderConfigSource,
  AiProviderConfigUpdate,
  AiProviderConfigView,
} from '../types/ai'

export const AI_PROVIDER_CONFIG_ID = 'default' as const
export const MAX_AI_API_KEY_LENGTH = 512

export type AiProviderConfigValidation =
  | { valid: true; update: AiProviderConfigUpdate }
  | { valid: false; message: string }

export function validateAiProviderConfigUpdate(input: unknown): AiProviderConfigValidation {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, message: 'AI 配置必须是对象' }
  }

  const value = input as Record<string, unknown>
  const update: AiProviderConfigUpdate = {}
  let hasField = false

  if (value.baseURL !== undefined) {
    hasField = true
    if (value.baseURL === null) {
      update.baseURL = null
    } else if (typeof value.baseURL !== 'string') {
      return { valid: false, message: 'Base URL 必须是文本或 null' }
    } else {
      const baseURL = value.baseURL.trim()
      if (!baseURL) return { valid: false, message: 'Base URL 不能为空；如需清除覆盖请使用 null' }
      let parsed: URL
      try {
        parsed = new URL(baseURL)
      } catch {
        return { valid: false, message: 'Base URL 格式无效' }
      }
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { valid: false, message: 'Base URL 仅支持 http 或 https' }
      }
      if (!parsed.hostname) return { valid: false, message: 'Base URL 必须包含主机名' }
      update.baseURL = baseURL.replace(/\/+$/, '')
    }
  }

  if (value.apiKey !== undefined) {
    hasField = true
    if (value.apiKey === null) {
      update.apiKey = null
    } else if (typeof value.apiKey !== 'string') {
      return { valid: false, message: 'API Key 必须是文本或 null' }
    } else {
      const apiKey = value.apiKey.trim()
      if (!apiKey) return { valid: false, message: 'API Key 不能为空；如需清除覆盖请使用 null' }
      if (apiKey.length > MAX_AI_API_KEY_LENGTH) {
        return { valid: false, message: `API Key 不能超过 ${MAX_AI_API_KEY_LENGTH} 个字符` }
      }
      update.apiKey = apiKey
    }
  }

  if (!hasField) return { valid: false, message: '至少需要修改 Base URL 或 API Key' }
  return { valid: true, update }
}

export function applyAiProviderConfigUpdate(
  current: AiProviderConfig | null,
  update: AiProviderConfigUpdate,
  updatedBy: string,
  updatedAt: number = Date.now(),
): Omit<AiProviderConfig, '_id'> {
  const baseURL = update.baseURL !== undefined ? update.baseURL : current?.baseURL
  const apiKey = update.apiKey !== undefined ? update.apiKey : current?.apiKey

  return {
    configId: AI_PROVIDER_CONFIG_ID,
    ...(baseURL === undefined ? {} : { baseURL }),
    ...(apiKey === undefined ? {} : { apiKey }),
    updatedAt,
    updatedBy,
  }
}

export function mergeAiProviderEnvironment(
  env: Record<string, string | undefined>,
  persisted: AiProviderConfig | null,
): Record<string, string | undefined> {
  return {
    ...env,
    AI_BASE_URL: persisted?.baseURL || env.AI_BASE_URL,
    AI_API_KEY: persisted?.apiKey || env.AI_API_KEY,
  }
}

export function toAiProviderConfigView(
  env: Record<string, string | undefined>,
  persisted: AiProviderConfig | null,
): AiProviderConfigView {
  const databaseBaseURL = Boolean(persisted?.baseURL)
  const databaseApiKey = Boolean(persisted?.apiKey)
  const environmentBaseURL = Boolean(env.AI_BASE_URL)
  const environmentApiKey = Boolean(env.AI_API_KEY)
  const databaseFields = Number(databaseBaseURL) + Number(databaseApiKey)
  const environmentFields = Number(environmentBaseURL) + Number(environmentApiKey)
  const source: AiProviderConfigSource = databaseFields > 0 && environmentFields > 0
    ? 'mixed'
    : databaseFields > 0
      ? 'database'
      : 'environment'

  return {
    baseURL: persisted?.baseURL || env.AI_BASE_URL || '',
    model: env.AI_MODEL || '',
    apiKeyConfigured: databaseApiKey || environmentApiKey,
    source,
    updatedAt: persisted?.updatedAt,
  }
}
