/**
 * @file 运行模式配置
 * @description 控制前端服务层使用本地 Mock 还是真实云函数
 */

export type RunMode = 'local' | 'cloud'

const configuredMode = process.env.TARO_APP_RUN_MODE

export const CURRENT_MODE: RunMode = configuredMode === 'cloud' ? 'cloud' : 'local'

export const CLOUD_ENV_ID = process.env.TARO_APP_CLOUD_ENV_ID ?? ''

export const CLOUD_TRACE_USER = process.env.TARO_APP_CLOUD_TRACE_USER !== 'false'
