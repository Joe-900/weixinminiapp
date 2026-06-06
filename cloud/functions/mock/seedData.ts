/**
 * @file 种子数据
 * @description 本地 Mock 模式下的预置测试数据
 */

import type { User } from '../../src/types/user'
import type { Book } from '../../src/types/book'

export const SEED_ADMIN_OPENID = 'admin_openid_001'
export const SEED_USER_OPENID = 'user_openid_002'

export const seedUsers: User[] = [
  {
    _id: SEED_ADMIN_OPENID,
    openid: SEED_ADMIN_OPENID,
    nickname: '管理员',
    avatar: '',
    role: 'admin',
    createdAt: Date.now() - 86400000,
  },
  {
    _id: SEED_USER_OPENID,
    openid: SEED_USER_OPENID,
    nickname: '测试用户',
    avatar: '',
    role: 'user',
    createdAt: Date.now() - 43200000,
  },
]

export const seedBooks: Book[] = [
  {
    _id: 'book_001',
    bookId: 'book_001',
    title: '西游记',
    author: '吴承恩',
    isbn: '9787020008735',
    cover: 'local-mock://cover/xiyouji.png',
    summary: '中国古典四大名著之一，讲述唐僧师徒四人西天取经的故事。',
    status: 'online',
    addedBy: SEED_ADMIN_OPENID,
    createdAt: Date.now() - 172800000,
    updatedAt: Date.now() - 172800000,
  },
  {
    _id: 'book_002',
    bookId: 'book_002',
    title: '红楼梦',
    author: '曹雪芹',
    isbn: '9787020002207',
    cover: 'local-mock://cover/hongloumeng.png',
    summary: '中国古典四大名著之首，以贾宝玉和林黛玉的爱情悲剧为主线。',
    status: 'online',
    addedBy: SEED_ADMIN_OPENID,
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now() - 86400000,
  },
  {
    _id: 'book_003',
    bookId: 'book_003',
    title: '三国演义',
    author: '罗贯中',
    isbn: '9787020008728',
    cover: 'local-mock://cover/sanguoyanyi.png',
    summary: '中国古典四大名著之一，描述东汉末年到西晋初年的历史风云。',
    status: 'offline',
    addedBy: SEED_ADMIN_OPENID,
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 86400000,
  },
]
