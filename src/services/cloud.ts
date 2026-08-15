/**
 * 微信云开发初始化。
 */

import Taro from '@tarojs/taro'
import { CLOUD_ENV_ID, CLOUD_TRACE_USER, CURRENT_MODE } from '../types/config'

let initialized = false

export function initializeCloud(): void {
  if (CURRENT_MODE !== 'cloud' || initialized) return
  if (!CLOUD_ENV_ID) {
    throw new Error('TARO_APP_CLOUD_ENV_ID is required in cloud mode')
  }

  Taro.cloud.init({
    env: CLOUD_ENV_ID,
    traceUser: CLOUD_TRACE_USER,
  })
  initialized = true
}

export function isCloudInitialized(): boolean {
  return initialized
}
