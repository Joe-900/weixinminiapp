/**
 * @file 本地Mock模式种子数据
 * @description 包含模拟用户和书籍数据，以及当前模拟登录身份配置
 * 切换管理员/普通用户：修改 MOCK_LOGIN_ROLE 即可
 */

import type { User, UserRole } from '../types/user'
import type { Book } from '../types/book'

export const SEED_ADMIN_OPENID = 'admin_openid_001'
export const SEED_USER_OPENID = 'user_openid_002'

/**
 * 本地Mock模式下的模拟登录身份
 * 'admin' = 以管理员身份登录（可看到书籍管理入口）
 * 'user'  = 以普通用户身份登录
 * 修改此值后重新编译即可切换身份
 */
export const MOCK_LOGIN_ROLE: UserRole = 'user'

const OPENID_MAP: Record<UserRole, string> = {
  admin: SEED_ADMIN_OPENID,
  user: SEED_USER_OPENID,
}

export const MOCK_LOGIN_OPENID = OPENID_MAP[MOCK_LOGIN_ROLE]

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
    nickname: '阅读者',
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
    summary: '中国古典四大名著之一，讲述唐僧师徒四人西天取经的神话故事。',
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
    summary: '中国古典小说巅峰之作，以贾宝玉与林黛玉的爱情悲剧为主线，展现封建大家族的兴衰。',
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
    summary: '中国古典四大名著之一，描写东汉末年群雄割据和三国鼎立的历史小说。',
    status: 'offline',
    addedBy: SEED_ADMIN_OPENID,
    createdAt: Date.now() - 259200000,
    updatedAt: Date.now() - 86400000,
  },
]
