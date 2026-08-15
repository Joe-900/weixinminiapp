/**
 * @file User domain local mock tests
 * @description Test login new user, existing user, identity forgery, param validation
 */

import { MemoryRepository } from '../mock/memoryRepository'
import { userMain } from './index'
import { ErrorCode } from '../../../src/types/common'
import { seedUsers, SEED_USER_OPENID } from '../mock/seedData'
import type { Repository } from '../interfaces/repository'
import type { LoginResult, User } from '../../../src/types/user'
import type { ApiResponse } from '../../../src/types/common'

let repo: Repository

beforeEach(() => {
  repo = new MemoryRepository()
  ;(repo as MemoryRepository).seedUsers(seedUsers)
})

describe('User domain - login', () => {
  test('New user login: auto create record with role=user', async () => {
    const newOpenid = 'new_user_003'
    const result = await userMain(
      { action: 'login' },
      { OPENID: newOpenid },
      repo,
    ) as ApiResponse<LoginResult>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data).not.toBeNull()
    expect(result.data!.openid).toBe(newOpenid)
    expect(result.data!.role).toBe('user')

    const user = await repo.findUserByOpenid(newOpenid)
    expect(user).not.toBeNull()
    expect(user!.role).toBe('user')
  })

  test('Existing user login: return existing record', async () => {
    const result = await userMain(
      { action: 'login' },
      { OPENID: SEED_USER_OPENID },
      repo,
    ) as ApiResponse<LoginResult>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data!.openid).toBe(SEED_USER_OPENID)
    expect(result.data!.role).toBe('user')
  })

  test('Identity forgery: fake openid in params is ignored', async () => {
    const fakeOpenid = 'fake_openid_hacker'
    const result = await userMain(
      { action: 'login', openid: fakeOpenid },
      { OPENID: SEED_USER_OPENID },
      repo,
    ) as ApiResponse<LoginResult>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data!.openid).toBe(SEED_USER_OPENID)
    expect(result.data!.openid).not.toBe(fakeOpenid)
  })

  test('Empty openid returns 1001', async () => {
    const result = await userMain(
      { action: 'login' },
      { OPENID: '' },
      repo,
    )

    expect(result.code).toBe(ErrorCode.UNAUTHORIZED)
  })
})

describe('User domain - profile', () => {
  test('Update user profile success', async () => {
    const result = await userMain(
      { action: 'profile', nickname: 'new_nickname', avatar: 'new_avatar.png' },
      { OPENID: SEED_USER_OPENID },
      repo,
    ) as ApiResponse<User>

    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data!.nickname).toBe('new_nickname')
    expect(result.data!.avatar).toBe('new_avatar.png')
  })

  test('Param validation: missing nickname returns 1003', async () => {
    const result = await userMain(
      { action: 'profile', avatar: 'avatar.png' },
      { OPENID: SEED_USER_OPENID },
      repo,
    )

    expect(result.code).toBe(ErrorCode.BAD_REQUEST)
    expect(result.message).toContain('nickname')
  })

  test('Param validation: missing avatar returns 1003', async () => {
    const result = await userMain(
      { action: 'profile', nickname: 'nick' },
      { OPENID: SEED_USER_OPENID },
      repo,
    )

    expect(result.code).toBe(ErrorCode.BAD_REQUEST)
    expect(result.message).toContain('avatar')
  })
})

describe('User domain - unknown action', () => {
  test('Unknown action returns 1003', async () => {
    const result = await userMain(
      { action: 'unknownAction' },
      { OPENID: SEED_USER_OPENID },
      repo,
    )

    expect(result.code).toBe(ErrorCode.BAD_REQUEST)
  })

  test('Missing action returns 1003', async () => {
    const result = await userMain(
      {},
      { OPENID: SEED_USER_OPENID },
      repo,
    )

    expect(result.code).toBe(ErrorCode.BAD_REQUEST)
  })
})
