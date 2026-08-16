import { callMockFunction, resetMockData } from '../services/mockBridge'
import { SEED_CLASS_GROUP_ID } from './seedData'
import type { ClassGroup, CommunityMember } from '../types/community'
import type { ReadingTask } from '../types/task'

beforeEach(() => {
  resetMockData()
})

test('local mock exposes a class with members and a published task', async () => {
  const groups = await callMockFunction<ClassGroup[]>('community', { action: 'list' })
  expect(groups.code).toBe(0)
  expect(groups.data?.some((group) => group.groupId === SEED_CLASS_GROUP_ID)).toBe(true)

  const members = await callMockFunction<CommunityMember[]>('community', {
    action: 'members',
    groupId: SEED_CLASS_GROUP_ID,
  })
  expect(members.code).toBe(0)
  expect(members.data).toHaveLength(2)

  const tasks = await callMockFunction<ReadingTask[]>('task', { action: 'list' })
  expect(tasks.code).toBe(0)
  expect(tasks.data?.some((task) => task.groupId === SEED_CLASS_GROUP_ID)).toBe(true)
})

test('local book bridge forwards fuzzy author filters and sort options', async () => {
  const books = await callMockFunction<{ list: Array<{ title: string }>; total: number }>('book', {
    action: 'list',
    page: 1,
    pageSize: 10,
    keyword: '吴承',
    keywordField: 'author',
    sortBy: 'title',
    sortOrder: 'asc',
  })

  expect(books.code).toBe(0)
  expect(books.data?.list.map((book) => book.title)).toEqual(['西游记'])
})
