import { MemoryRepository } from './mock/memoryRepository'
import { seedBooks, seedUsers, SEED_ADMIN_OPENID, SEED_USER_OPENID } from './mock/seedData'
import { communityMain } from './community'
import { libraryMain, mapBuptLibraryRow } from './library'
import { noteMain } from './note'
import { rankingMain } from './ranking'
import { reservationMain } from './reservation'
import { taskMain } from './task'
import { ErrorCode } from '../../src/types/common'
import { MockReservationProvider } from './mock/mockReservationProvider'

function setup(): MemoryRepository {
  const repo = new MemoryRepository()
  repo.seedUsers(seedUsers)
  repo.seedBooks(seedBooks)
  return repo
}

describe('platform domains', () => {
  test('maps the actual BUPT crawler column names to metadata only', () => {
    const mapped = mapBuptLibraryRow({
      rec_ctrl_id: 'r1',
      title: '  A book ',
      authors: 'Author',
      isbn_issn: '978-1',
      publisher: 'Publisher',
      publish_date: '2024',
      classno_abs: 'B821',
      subject_terms: 'reading',
      library_name: 'BUPT',
      holdings_count: '2',
      available_count: '0',
    })
    expect(mapped).toMatchObject({
      title: 'A book',
      isbn: '978-1',
      callNumber: 'B821',
      holdingsCount: 2,
      availableCount: 0,
      collectionStatus: 'unavailable',
    })
    expect(mapped).not.toHaveProperty('raw_json')
  })

  test('class, task confirmation and ranking use server events', async () => {
    const repo = setup()
    const created = await communityMain(
      { action: 'create', name: 'Class 1', type: 'class' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    )
    expect(created.code).toBe(ErrorCode.SUCCESS)
    const groupId = (created.data as { groupId: string }).groupId
    const inviteCode = (created.data as { inviteCode: string }).inviteCode

    const joined = await communityMain(
      { action: 'join', inviteCode },
      { OPENID: SEED_USER_OPENID },
      repo,
    )
    expect(joined.code).toBe(ErrorCode.SUCCESS)

    const task = await taskMain(
      { action: 'create', groupId, bookId: 'book_001', title: 'Read', description: 'Discuss' },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    )
    expect(task.code).toBe(ErrorCode.SUCCESS)
    const taskId = (task.data as { taskId: string }).taskId
    const submission = await taskMain(
      { action: 'submit', taskId, text: 'My response' },
      { OPENID: SEED_USER_OPENID },
      repo,
    )
    expect(submission.code).toBe(ErrorCode.SUCCESS)
    const submissionId = (submission.data as { submissionId: string }).submissionId

    const feedback = await taskMain(
      { action: 'feedback', submissionId, comment: 'Good', score: 90, confirmed: true },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    )
    expect(feedback.code).toBe(ErrorCode.SUCCESS)

    const ranking = await rankingMain({ action: 'list', groupId }, { OPENID: SEED_ADMIN_OPENID }, repo)
    expect(ranking.code).toBe(ErrorCode.SUCCESS)
    expect((ranking.data as { entries: Array<{ openid: string; score: number }> }).entries).toEqual(
      expect.arrayContaining([expect.objectContaining({ openid: SEED_USER_OPENID, score: expect.any(Number) })]),
    )
  })

  test('reservation is isolated to its owner and uses mock provider', async () => {
    const repo = setup()
    const provider = new MockReservationProvider()
    const result = await reservationMain(
      { action: 'reserve', bookId: 'book_001' },
      { OPENID: SEED_USER_OPENID },
      repo,
      provider,
    )
    expect(result.code).toBe(ErrorCode.SUCCESS)
    const reservationId = (result.data as { reservationId: string }).reservationId
    const denied = await reservationMain(
      { action: 'cancel', reservationId },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
      provider,
    )
    expect(denied.code).toBe(ErrorCode.ACCESS_DENIED)
  })

  test('check-in creates a verified reading event', async () => {
    const repo = setup()
    const result = await noteMain(
      { action: 'checkIn', bookId: 'book_001', minutes: 20 },
      { OPENID: SEED_USER_OPENID },
      repo,
    )
    expect(result.code).toBe(ErrorCode.SUCCESS)
    const events = await repo.listReadingEvents(SEED_USER_OPENID, 'book_001')
    expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ eventType: 'checkin', source: 'system' })]))
  })

  test('library import is admin-only and stores no正文 field', async () => {
    const repo = setup()
    const denied = await libraryMain(
      { action: 'import', items: [{ title: 'x', librarySource: 'source' }] },
      { OPENID: SEED_USER_OPENID },
      repo,
    )
    expect(denied.code).toBe(ErrorCode.FORBIDDEN)
    const imported = await libraryMain(
      { action: 'import', items: [{ title: 'x', author: 'a', librarySource: 'source', isbn: 'new-isbn' }] },
      { OPENID: SEED_ADMIN_OPENID },
      repo,
    )
    expect(imported.code).toBe(ErrorCode.SUCCESS)
    const id = (imported.data as { bookIds: string[] }).bookIds[0]
    const book = await repo.findBookById(id)
    expect(book).toMatchObject({ title: 'x', librarySource: 'source' })
    expect(book).not.toHaveProperty('content')
  })
})
