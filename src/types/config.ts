/**
 * @file 运行模式配置
 * @description 控制前端服务层使用本地 Mock 还是真实云函数
 */

export type RunMode = 'local' | 'cloud'

export const CURRENT_MODE: RunMode = 'local'
