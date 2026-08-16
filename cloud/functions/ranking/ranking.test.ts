/**
 * @file Ranking domain tests
 * @description 排行榜计分、作废事件权限与实时过滤、原因必填与可追溯
 */

import { MemoryRepository } from '../mock/memoryRepository'
import { rankingMain } from './index'
import { ErrorCode } from '../../../src/types/common'
import type { ApiResponse } from '../../../src/types/common'
import {
  seedUsers,
  seedBooks,
  SEED_ADMIN_OPENID,
  SEED_USER_OPENID,
} from '../mock/seedData'
import type { Repository } from '../interfaces/repository'
import type { ReadingEvent } from '../../../src/types/reading'
import type { User, UserRole } from '../../../src/types/user'

let repo: Repository

const NOW = Date.now()

function makeUser(openid: string, role: UserRole): User {
  return {
    _id: openid,
    openid,
    nickname: role === 'teacher' ? `Teacher-${openid}` : `User-${openid}`,
    avatar: '',
    role,
    createdAt: NOW - 86400000,
  }
}

beforeEach(async () => {
  repo = new MemoryRepository()
  ;(repo as MemoryRepository).seedUsers(seedUsers)
  ;(repo as MemoryRepository).seedBooks(seedBooks)
})

describe('Ranking - scoring', () => {
  test('system events count, invalidated events are excluded in real time', async () => {
    const event = await repo.addReadingEvent({
      openid: SEED_USER_OPENID,
      bookId: 'book_001',
      eventType: 'checkin',
      source: 'system',
      createdAt: NOW,
    })
    await repo.addReadingEvent({
      openid: SEED_USER_OPENID,
      bookId: 'book_001',
      eventType: 'plan_completed',
      source: 'system',
      createdAt: NOW + 1,
    })
    await repo.invalidateReadingEvent(event.eventId, SEED_ADMIN_OPENID, '测试作废')

    const result = await rankingMain({ action: 'list' }, { OPENID: SEED_USER_OPENID }, repo) as ApiResponse<{
      entries: Array<{ score: number; validEventCount: number }>
    }>
    expect(result.code).toBe(ErrorCode.SUCCESS)
    const entry = result.data!.entries.find((item) => item.validEventCount > 0)
    // 作废的 checkin 不参与，仅 plan_completed(5分) 计入
    expect(entry!.score).toBe(5)
    expect(entry!.validEventCount).toBe(1)
  })

  test('checkin dedup per user/book/day', async () => {
    for (let i = 0; i < 3; i += 1) {
      await repo.addReadingEvent({
        openid: SEED_USER_OPENID,
        bookId: 'book_001',
        eventType: 'checkin',
        source: 'system',
        createdAt: NOW + i * 1000,
      })
    }
    const result = await rankingMain({ action: 'list' }, { OPENID: SEED_USER_OPENID }, repo) as ApiResponse<{
      entries: Array<{ score: number; validEventCount: number }>
    }>
    const entry = result.data!.entries.find((item) => item.validEventCount > 0)
    expect(entry!.score).toBe(1)
    expect(entry!.validEventCount).toBe(1)
  })
})

describe('Ranking - invalidate permission', () => {
  test('admin can invalidate any event; reason is recorded and traceable', async () => {
    const event = await repo.addReadingEvent({
      openid: SEED_USER_OPENID,
      bookId: 'book_001',
      eventType: 'checkin',
      source: 'system',
      createdAt: NOW,
    })
    const result = await rankingMain(
      { action: 'invalidate', eventId: event.eventId, reason: '管理员发现异常打卡' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    ) as ApiResponse<ReadingEvent>
    expect(result.code).toBe(ErrorCode.SUCCESS)
    expect(result.data!.invalidated).toBe(true)
    expect(result.data!.invalidatedBy).toBe(SEED_ADMIN_OPENID)
    expect(result.data!.invalidateReason).toBe('管理员发现异常打卡')
    expect(result.data!.invalidatedAt).toBeDefined()
  })

  test('ordinary user cannot invalidate events', async () => {
    const event = await repo.addReadingEvent({
      openid: SEED_USER_OPENID,
      bookId: 'book_001',
      eventType: 'checkin',
      source: 'system',
      createdAt: NOW,
    })
    const result = await rankingMain(
      { action: 'invalidate', eventId: event.eventId, reason: 'x' },
      { OPENID: SEED_USER_OPENID },
      repo,
    ) as ApiResponse<ReadingEvent>
    expect(result.code).toBe(ErrorCode.FORBIDDEN)
  })

  test('teacher can invalidate events in own group only', async () => {
    const teacherId = 'teacher_openid_001'
    const otherTeacherId = 'teacher_openid_002'
    await repo.createUser(makeUser(teacherId, 'teacher'))
    await repo.createUser(makeUser(otherTeacherId, 'teacher'))
    const group = await repo.createCommunityGroup({
      name: '三班',
      type: 'class',
      ownerOpenid: teacherId,
      inviteCode: 'INV001',
      createdAt: NOW,
    })

    // 负责教师（小组创建者）可作废本组事件
    const ownEvent = await repo.addReadingEvent({
      openid: SEED_USER_OPENID,
      bookId: 'book_001',
      eventType: 'task_submitted',
      source: 'system',
      taskId: 'task_001',
      groupId: group.groupId,
      classId: group.groupId,
      createdAt: NOW,
    })
    const own = await rankingMain(
      { action: 'invalidate', eventId: ownEvent.eventId, reason: '重复提交' },
      { OPENID: teacherId },
      repo,
    ) as ApiResponse<ReadingEvent>
    expect(own.code).toBe(ErrorCode.SUCCESS)
    expect(own.data!.invalidated).toBe(true)

    // 另一教师无权作废他人小组事件
    const otherEvent = await repo.addReadingEvent({
      openid: SEED_USER_OPENID,
      bookId: 'book_001',
      eventType: 'task_submitted',
      source: 'system',
      taskId: 'task_002',
      groupId: group.groupId,
      classId: group.groupId,
      createdAt: NOW + 1,
    })
    const other = await rankingMain(
      { action: 'invalidate', eventId: otherEvent.eventId, reason: 'x' },
      { OPENID: otherTeacherId },
      repo,
    ) as ApiResponse<ReadingEvent>
    expect(other.code).toBe(ErrorCode.FORBIDDEN)
  })

  test('teacher cannot invalidate personal events without group', async () => {
    const teacherId = 'teacher_openid_003'
    await repo.createUser(makeUser(teacherId, 'teacher'))
    const event = await repo.addReadingEvent({
      openid: SEED_USER_OPENID,
      bookId: 'book_001',
      eventType: 'checkin',
      source: 'system',
      createdAt: NOW,
    })
    const result = await rankingMain(
      { action: 'invalidate', eventId: event.eventId, reason: 'x' },
      { OPENID: teacherId },
      repo,
    ) as ApiResponse<ReadingEvent>
    expect(result.code).toBe(ErrorCode.FORBIDDEN)
  })

  test('reason is required', async () => {
    const event = await repo.addReadingEvent({
      openid: SEED_USER_OPENID,
      bookId: 'book_001',
      eventType: 'checkin',
      source: 'system',
      createdAt: NOW,
    })
    const result = await rankingMain(
      { action: 'invalidate', eventId: event.eventId },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    ) as ApiResponse<ReadingEvent>
    expect(result.code).toBe(ErrorCode.BAD_REQUEST)
  })

  test('invalidating a missing event returns NOT_FOUND', async () => {
    const result = await rankingMain(
      { action: 'invalidate', eventId: 'event_none', reason: 'x' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    ) as ApiResponse<ReadingEvent>
    expect(result.code).toBe(ErrorCode.NOT_FOUND)
  })
})