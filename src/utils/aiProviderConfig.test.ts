import {
  applyAiProviderConfigUpdate,
  mergeAiProviderEnvironment,
  toAiProviderConfigView,
  validateAiProviderConfigUpdate,
} from './aiProviderConfig'

describe('AI Provider config validation', () => {
  test('normalizes URL and accepts a new API key without exposing it', () => {
    const result = validateAiProviderConfigUpdate({
      baseURL: ' https://api.example.com/v1/// ',
      apiKey: ' provider-secret ',
    })

    expect(result).toEqual({
      valid: true,
      update: { baseURL: 'https://api.example.com/v1', apiKey: 'provider-secret' },
    })
  })

  test('rejects non-http URLs and empty updates', () => {
    expect(validateAiProviderConfigUpdate({ baseURL: 'file:///tmp/provider' }).valid).toBe(false)
    expect(validateAiProviderConfigUpdate({}).valid).toBe(false)
  })

  test('merges persisted values over environment values', () => {
    const env = {
      AI_BASE_URL: 'https://env.example.com/v1',
      AI_API_KEY: 'env-key',
      AI_MODEL: 'env-model',
    }
    const persisted = {
      configId: 'default' as const,
      baseURL: 'https://database.example.com/v1',
      apiKey: 'database-key',
      updatedAt: 123,
      updatedBy: 'admin',
    }

    expect(mergeAiProviderEnvironment(env, persisted)).toMatchObject({
      AI_BASE_URL: 'https://database.example.com/v1',
      AI_API_KEY: 'database-key',
      AI_MODEL: 'env-model',
    })
    expect(toAiProviderConfigView(env, persisted)).toEqual({
      baseURL: 'https://database.example.com/v1',
      model: 'env-model',
      apiKeyConfigured: true,
      source: 'mixed',
      updatedAt: 123,
    })
  })

  test('preserves untouched fields and null overrides without undefined properties', () => {
    const current = {
      configId: 'default' as const,
      baseURL: 'https://database.example.com/v1',
      apiKey: 'database-key',
      updatedAt: 123,
      updatedBy: 'admin',
    }

    expect(applyAiProviderConfigUpdate(current, { apiKey: null }, 'admin', 456)).toEqual({
      configId: 'default',
      baseURL: 'https://database.example.com/v1',
      apiKey: null,
      updatedAt: 456,
      updatedBy: 'admin',
    })
    expect(applyAiProviderConfigUpdate(null, { baseURL: 'https://new.example.com/v1' }, 'admin', 456)).toEqual({
      configId: 'default',
      baseURL: 'https://new.example.com/v1',
      updatedAt: 456,
      updatedBy: 'admin',
    })
  })
})
