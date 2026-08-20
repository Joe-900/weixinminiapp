/**
 * @file Seed data for local mock mode
 * @description Pre-populated test data for local mock
 */

import type { User } from '../../../src/types/user'
import type { Book } from '../../../src/types/book'

export const SEED_ADMIN_OPENID = 'admin_openid_001'
export const SEED_USER_OPENID = 'user_openid_002'

export const seedUsers: User[] = [
  {
    _id: SEED_ADMIN_OPENID,
    openid: SEED_ADMIN_OPENID,
    nickname: 'Admin',
    avatar: '',
    role: 'admin',
    createdAt: Date.now() - 86400000,
  },
  {
    _id: SEED_USER_OPENID,
    openid: SEED_USER_OPENID,
    nickname: 'TestUser',
    avatar: '',
    role: 'user',
    createdAt: Date.now() - 43200000,
  },
]

export const seedBooks: Book[] = [
  {
    _id: 'book_001',
    bookId: 'book_001',
    title: 'Journey to the West',
    author: 'Wu Chengen',
    isbn: '9787020008735',
    cover: 'local-mock://cover/xiyouji.png',
    summary: 'One of the Four Great Classical Novels of Chinese literature.',
    tags: ['classic', 'mythology'],
    status: 'online',
    addedBy: SEED_ADMIN_OPENID,
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
  },
  {
    _id: 'book_002',
    bookId: 'book_002',
    title: 'Dream of the Red Chamber',
    author: 'Cao Xueqin',
    isbn: '9787020002207',
    cover: 'local-mock://cover/hongloumeng.png',
    summary: 'The greatest of the Chinese classical novels.',
    tags: ['classic', 'family'],
    status: 'online',
    addedBy: SEED_ADMIN_OPENID,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    _id: 'book_003',
    bookId: 'book_003',
    title: 'Romance of the Three Kingdoms',
    author: 'Luo Guanzhong',
    isbn: '9787020008728',
    cover: 'local-mock://cover/sanguoyanyi.png',
    summary: 'A historical novel set in the turbulent years near the end of the Han dynasty.',
    status: 'offline',
    addedBy: SEED_ADMIN_OPENID,
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 86400000,
  },
]
