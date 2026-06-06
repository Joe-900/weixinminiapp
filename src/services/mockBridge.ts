/**
 * @file Local Mock bridge
 * @description Local mode directly calls mock business functions, returns unified envelope
 * Frontend is unaware of local vs cloud mode
 */

import type { ApiResponse } from '../types/common'
import { MemoryRepository } from '../../cloud/functions/mock/memoryRepository'
import { LocalStorage } from '../../cloud/functions/mock/localStorage'
import { MockAiClient } from '../../cloud/functions/mock/mockAiClient'
import { seedUsers, seedBooks } from '../../cloud/functions/mock/seedData'
import { userMain } from '../../cloud/functions/user/index'
import { bookMain } from '../../cloud/functions/book/index'
import { aiMain } from '../../cloud/functions/ai/index'
import { noteMain } from '../../cloud/functions/note/index'
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

const MOCK_CTX = { OPENID: 'user_openid_002' }

export async function callMockFunction<T = unknown>(
  functionName: string,
  data: Record<string, unknown>,
): Promise<ApiResponse<T>> {
  switch (functionName) {
    case 'user':
      return userMain(data, MOCK_CTX, repo) as Promise<ApiResponse<T>>

    case 'book':
      return bookMain(data, MOCK_CTX, repo) as Promise<ApiResponse<T>>

    case 'ai':
      return aiMain(data, MOCK_CTX, repo, aiClient) as Promise<ApiResponse<T>>

    case 'note':
      return noteMain(data, MOCK_CTX, repo) as Promise<ApiResponse<T>>

    default:
      return {
        code: 5000,
        message: `Unknown cloud function: ${functionName}`,
        data: null,
      }
  }
}
