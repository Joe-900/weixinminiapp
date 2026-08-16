/**
 * @file 本地Mock模式种子数据
 * @description 包含模拟用户和书籍数据，以及当前模拟登录身份配置
 * 切换管理员/普通用户：修改 MOCK_LOGIN_ROLE 即可
 */

import type { User, UserRole } from '../types/user'
import type { Book } from '../types/book'
import type { ClassGroup, CommunityMember } from '../types/community'
import type { ReadingTask } from '../types/task'
import type { ReadingEvent } from '../types/reading'
import { toBuptSeedBooks } from './buptMetadataSeed'

export const SEED_ADMIN_OPENID = 'admin_openid_001'
export const SEED_USER_OPENID = 'user_openid_002'
export const SEED_CLASS_GROUP_ID = 'class_demo_001'
export const SEED_READING_GROUP_ID = 'reading_group_demo_001'

/**
 * 本地Mock模式下的模拟登录身份
 * 'admin' = 以管理员身份登录（可看到书籍管理入口）
 * 'user'  = 以普通用户身份登录
 * 修改此值后重新编译即可切换身份
 */
export const MOCK_LOGIN_ROLE: UserRole = 'admin'

const OPENID_MAP: Record<UserRole, string> = {
  admin: SEED_ADMIN_OPENID,
  user: SEED_USER_OPENID,
  student: SEED_USER_OPENID,
  teacher: SEED_ADMIN_OPENID,
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
  ...toBuptSeedBooks(SEED_ADMIN_OPENID),
]

export const seedGroups: ClassGroup[] = [
  {
    _id: SEED_CLASS_GROUP_ID,
    groupId: SEED_CLASS_GROUP_ID,
    name: '示例阅读班',
    type: 'class',
    ownerOpenid: SEED_ADMIN_OPENID,
    inviteCode: 'READ2026',
    createdAt: Date.now() - 86400000,
  },
  {
    _id: SEED_READING_GROUP_ID,
    groupId: SEED_READING_GROUP_ID,
    name: '名著讨论小组',
    type: 'reading_group',
    ownerOpenid: SEED_ADMIN_OPENID,
    inviteCode: 'BOOK2026',
    createdAt: Date.now() - 43200000,
  },
]

export const seedMembers: CommunityMember[] = [
  {
    _id: 'member_demo_admin_class',
    memberId: 'member_demo_admin_class',
    groupId: SEED_CLASS_GROUP_ID,
    openid: SEED_ADMIN_OPENID,
    role: 'teacher',
    joinedAt: Date.now() - 86400000,
  },
  {
    _id: 'member_demo_user_class',
    memberId: 'member_demo_user_class',
    groupId: SEED_CLASS_GROUP_ID,
    openid: SEED_USER_OPENID,
    role: 'member',
    joinedAt: Date.now() - 82800000,
  },
  {
    _id: 'member_demo_admin_group',
    memberId: 'member_demo_admin_group',
    groupId: SEED_READING_GROUP_ID,
    openid: SEED_ADMIN_OPENID,
    role: 'owner',
    joinedAt: Date.now() - 43200000,
  },
  {
    _id: 'member_demo_user_group',
    memberId: 'member_demo_user_group',
    groupId: SEED_READING_GROUP_ID,
    openid: SEED_USER_OPENID,
    role: 'member',
    joinedAt: Date.now() - 39600000,
  },
]

export const seedTasks: ReadingTask[] = [
  {
    _id: 'task_demo_class_001',
    taskId: 'task_demo_class_001',
    groupId: SEED_CLASS_GROUP_ID,
    teacherOpenid: SEED_ADMIN_OPENID,
    bookId: 'book_001',
    title: '《西游记》人物讨论',
    description: '结合你读过的内容，写下一个印象最深的人物和理由。',
    dueAt: Date.now() + 7 * 86400000,
    createdAt: Date.now() - 3600000,
    status: 'published',
  },
  {
    _id: 'task_demo_group_001',
    taskId: 'task_demo_group_001',
    groupId: SEED_READING_GROUP_ID,
    teacherOpenid: SEED_ADMIN_OPENID,
    bookId: 'book_002',
    title: '《红楼梦》片段提问',
    description: '记录一个你想和小组成员讨论的问题，可以附上图片或笔记。',
    dueAt: Date.now() + 10 * 86400000,
    createdAt: Date.now() - 1800000,
    status: 'published',
  },
]

export const seedReadingEvents: ReadingEvent[] = [
  {
    _id: 'event_demo_admin_checkin',
    eventId: 'event_demo_admin_checkin',
    openid: SEED_ADMIN_OPENID,
    bookId: 'book_001',
    eventType: 'checkin',
    duration: 30,
    source: 'system',
    groupId: SEED_CLASS_GROUP_ID,
    classId: SEED_CLASS_GROUP_ID,
    createdAt: Date.now() - 7200000,
  },
  {
    _id: 'event_demo_user_task',
    eventId: 'event_demo_user_task',
    openid: SEED_USER_OPENID,
    bookId: 'book_001',
    eventType: 'task_submitted',
    source: 'system',
    taskId: 'task_demo_class_001',
    groupId: SEED_CLASS_GROUP_ID,
    classId: SEED_CLASS_GROUP_ID,
    createdAt: Date.now() - 3600000,
  },
]
