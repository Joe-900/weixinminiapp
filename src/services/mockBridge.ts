/**
 * @file 本地 Mock 桥接
 * @description 本地模式下直接调用 mock 业务函数，返回统一信封
 * 前端不感知当前是本地还是云模式
 */

import type { ApiResponse } from '../types/common'
import { MemoryRepository } from '../../cloud/functions/mock/memoryRepository'
import { LocalStorage } from '../../cloud/functions/mock/localStorage'
import { MockAiClient } from '../../cloud/functions/mock/mockAiClient'
import { seedUsers, seedBooks } from '../../cloud/functions/mock/seedData'
import { userMain } from '../../cloud/functions/user/index'
import type { Repository } from '../../cloud/functions/interfaces/repository'
import type { Storage } from '../../cloud/functions/interfaces/storage'
import type { AiClient } from '../../cloud/functions/interfaces/aiClient'

const repo = new MemoryRepository()
const storage = new LocalStorage()
const aiClient = new MockAiClient()

function initSeedData(): void {
  repo.seedUsers(seedUsers)
  repo.seedBooks(seedBooks)
}

initSeedData()

export function getMockDeps(): {
  repo: Repository
  storage: Storage
  aiClient: AiClient
} {
  return { repo, storage, aiClient }
}

export function resetMockData(): void {
  repo.reset()
  initSeedData()
}

/**
 * 本地模式下模拟云函数调用
 */
export async function callMockFunction<T = unknown>(
  functionName: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  const mockContext = { OPENID: 'user_openid_002' }

  switch (functionName) {
    case 'user':
      return userMain(data, mockContext, repo) as Promise<ApiResponse<T>>

    default:
      return {
        code: 5000,
        message: `未知的云函数: ${functionName}`,
        data: null,
      }
  }
}
