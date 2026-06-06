# Tasks

## 阶段一：Taro 骨架 + 云开发初始化 + 全局契约 + 登录

- [ ] Task 1: 初始化 Taro 项目并配置 TypeScript strict + ESLint + Prettier
  - [ ] 1.1 使用 Taro CLI 初始化项目（React + TypeScript 模板）
  - [ ] 1.2 配置 tsconfig.json 开启 strict，禁止 any
  - [ ] 1.3 配置 ESLint + Prettier 规则
  - [ ] 1.4 Git commit + tag: `init/taro-skeleton`

- [ ] Task 2: 搭建前端目录结构与全局类型基座
  - [ ] 2.1 创建目录结构：pages/home, pages/bookDetail, pages/aiChat, pages/notes, pages/profile, pages/admin, components/BookCard, components/ChatBubble, components/NoteItem, components/StateView, components/AuthGuard, store, services, types, utils
  - [ ] 2.2 创建 types/common.ts：统一返回信封 ApiResponse、错误码枚举 ErrorCode
  - [ ] 2.3 创建 types/user.ts：User 类型定义
  - [ ] 2.4 创建 types/book.ts：Book 类型定义
  - [ ] 2.5 创建 types/note.ts：Note、Checkin、CheckinStat 类型定义
  - [ ] 2.6 创建 types/ai.ts：AiSession、AiMessage、ChatRequest、ChatResponse 类型定义
  - [ ] 2.7 创建 types/index.ts：统一导出
  - [ ] 2.8 Git commit + tag: `feat/type-definitions`

- [ ] Task 3: 搭建云函数目录结构与全局契约
  - [ ] 3.1 创建 cloud/functions 目录
  - [ ] 3.2 创建 cloud/functions/common/response.ts：统一信封封装函数
  - [ ] 3.3 创建 cloud/functions/common/errors.ts：错误码常量与错误创建函数
  - [ ] 3.4 创建 cloud/functions/common/validate.ts：入参校验工具函数
  - [ ] 3.5 创建 cloud/functions/common/auth.ts：鉴权工具（取上下文 openid、查 role）
  - [ ] 3.6 Git commit + tag: `feat/cloud-common`

- [ ] Task 4: 实现依赖注入架构（Repository / Storage / AIClient 抽象接口）
  - [ ] 4.1 创建 cloud/functions/interfaces/repository.ts：数据访问抽象接口（增删改查、分页）
  - [ ] 4.2 创建 cloud/functions/interfaces/storage.ts：文件存储抽象接口（上传、获取链接）
  - [ ] 4.3 创建 cloud/functions/interfaces/aiClient.ts：AI 客户端抽象接口（chat completion）
  - [ ] 4.4 Git commit + tag: `feat/abstract-interfaces`

- [ ] Task 5: 实现本地 Mock 实现（内存 Repository、本地 Storage、假 AIClient）
  - [ ] 5.1 创建 cloud/functions/mock/memoryRepository.ts：基于内存的 Repository 实现
  - [ ] 5.2 创建 cloud/functions/mock/localStorage.ts：返回模拟 fileID 的 Storage 实现
  - [ ] 5.3 创建 cloud/functions/mock/mockAiClient.ts：离线假回复的 AIClient 实现
  - [ ] 5.4 创建 cloud/functions/mock/seedData.ts：种子数据
  - [ ] 5.5 Git commit + tag: `feat/mock-implementations`

- [ ] Task 6: 实现云实现（云数据库 Repository、云存储 Storage、OpenAI AIClient）
  - [ ] 6.1 创建 cloud/functions/cloud/cloudRepository.ts：基于云数据库的 Repository 实现
  - [ ] 6.2 创建 cloud/functions/cloud/cloudStorage.ts：基于云存储的 Storage 实现
  - [ ] 6.3 创建 cloud/functions/cloud/openaiAiClient.ts：基于 OpenAI 兼容格式的 AIClient 实现
  - [ ] 6.4 Git commit + tag: `feat/cloud-implementations`

- [ ] Task 7: 实现用户域业务逻辑与云函数入口
  - [ ] 7.1 创建 cloud/functions/user/userService.ts：纯业务函数（login、profile），通过注入 Repository 操作数据
  - [ ] 7.2 创建 cloud/functions/user/index.ts：云函数入口，鉴权后分发 action
  - [ ] 7.3 Git commit + tag: `feat/user-domain`

- [ ] Task 8: 实现前端服务层与状态层（用户域）
  - [ ] 8.1 创建 services/userService.ts：前端调用云函数的封装
  - [ ] 8.2 创建 services/request.ts：统一请求封装（loading、错误码映射、重试）
  - [ ] 8.3 创建 store/userStore.ts：用户状态管理（openid、role、登录态）
  - [ ] 8.4 创建 services/mockBridge.ts：本地模式下直接调用 mock 业务函数的桥接
  - [ ] 8.5 Git commit + tag: `feat/frontend-user-service`

- [ ] Task 9: 实现登录流程与 AuthGuard 组件
  - [ ] 9.1 实现 app.ts 入口：启动时静默登录
  - [ ] 9.2 实现 components/AuthGuard：权限包裹组件
  - [ ] 9.3 实现 components/StateView：空态与加载组件
  - [ ] 9.4 Git commit + tag: `feat/login-auth`

- [ ] Task 10: 编写用户域本地 Mock 测试
  - [ ] 10.1 测试：login 新用户创建记录
  - [ ] 10.2 测试：login 老用户返回记录
  - [ ] 10.3 测试：身份不可伪造（入参假 openid 被忽略）
  - [ ] 10.4 测试：入参校验（缺失字段返回 1003）
  - [ ] 10.5 Git commit + tag: `test/user-mock`

## 阶段二：数据库集合 + 书籍域读接口 + 书单和详情页

- [ ] Task 11: 实现书籍域业务逻辑与云函数入口
  - [ ] 11.1 创建 cloud/functions/book/bookService.ts：纯业务函数（list、detail、create、update、offline、online）
  - [ ] 11.2 创建 cloud/functions/book/index.ts：云函数入口
  - [ ] 11.3 Git commit + tag: `feat/book-domain`

- [ ] Task 12: 实现前端书籍服务层与状态层
  - [ ] 12.1 创建 services/bookService.ts：书籍域云函数调用封装
  - [ ] 12.2 创建 store/bookStore.ts：书籍状态管理（列表缓存、分页）
  - [ ] 12.3 Git commit + tag: `feat/frontend-book-service`

- [ ] Task 13: 实现书单首页
  - [ ] 13.1 实现 pages/home/index.tsx：书单首页，分页展示书籍卡片
  - [ ] 13.2 实现 components/BookCard：书籍卡片组件
  - [ ] 13.3 实现下拉刷新与上拉分页加载
  - [ ] 13.4 Git commit + tag: `feat/home-page`

- [ ] Task 14: 实现书籍详情页
  - [ ] 14.1 实现 pages/bookDetail/index.tsx：书籍详情页，显示完整元数据
  - [ ] 14.2 Git commit + tag: `feat/book-detail-page`

- [ ] Task 15: 编写书籍域本地 Mock 测试
  - [ ] 15.1 测试：list 只返回 status=online 的书
  - [ ] 15.2 测试：list 分页返回正确条数与 total
  - [ ] 15.3 测试：detail 返回正确书籍元数据
  - [ ] 15.4 测试：detail 不存在的 bookId 返回 1004
  - [ ] 15.5 测试：create 后内存库出现该记录
  - [ ] 15.6 测试：offline 后 status 变 offline 且记录仍在
  - [ ] 15.7 测试：online 后 status 变 online
  - [ ] 15.8 测试：普通用户调 create 返回 1002
  - [ ] 15.9 测试：入参校验（缺失字段返回 1003）
  - [ ] 15.10 Git commit + tag: `test/book-mock`

## 阶段三：管理员书籍管理 + 封面上传 + 上下架 + 权限兜底

- [ ] Task 16: 实现管理员书籍管理页
  - [ ] 16.1 实现 pages/admin/index.tsx：管理员书籍管理页（含 status 过滤）
  - [ ] 16.2 实现新增书籍表单（title、author、isbn、summary、cover）
  - [ ] 16.3 实现编辑书籍功能
  - [ ] 16.4 实现上下架操作
  - [ ] 16.5 AuthGuard 包裹管理员页面
  - [ ] 16.6 Git commit + tag: `feat/admin-page`

- [ ] Task 17: 实现封面上传链路
  - [ ] 17.1 前端选择图片并调用云存储上传
  - [ ] 17.2 拿到 fileID 后传入 create/update
  - [ ] 17.3 详情页用 fileID 渲染封面
  - [ ] 17.4 本地 Mock Storage 返回模拟 fileID
  - [ ] 17.5 Git commit + tag: `feat/cover-upload`

- [ ] Task 18: 编写管理员域本地 Mock 测试
  - [ ] 18.1 测试：admin 可 create/update/offline/online
  - [ ] 18.2 测试：非 admin 调写操作返回 1002
  - [ ] 18.3 测试：封面上传返回模拟 fileID 并存入
  - [ ] 18.4 测试：下架后 list 不显示，数据未删除
  - [ ] 18.5 Git commit + tag: `test/admin-mock`

## 阶段四：AI 伴读域 + 对话页 + 会话历史

- [ ] Task 19: 实现 AI 域业务逻辑与云函数入口
  - [ ] 19.1 创建 cloud/functions/ai/aiService.ts：纯业务函数（chat、loadHistory、listSessions）
  - [ ] 19.2 实现 system prompt 模板（注入书名、作者、简介）
  - [ ] 19.3 实现历史消息拼装（按时间升序，限制最近 N 条）
  - [ ] 19.4 实现用量保护（单日次数上限、单次长度上限）
  - [ ] 19.5 实现异常兜底（超时或报错返回 2001）
  - [ ] 19.6 创建 cloud/functions/ai/index.ts：云函数入口
  - [ ] 19.7 Git commit + tag: `feat/ai-domain`

- [ ] Task 20: 实现前端 AI 服务层与状态层
  - [ ] 20.1 创建 services/aiService.ts：AI 域云函数调用封装
  - [ ] 20.2 创建 store/aiStore.ts：AI 状态管理（当前会话、会话列表、消息列表）
  - [ ] 20.3 Git commit + tag: `feat/frontend-ai-service`

- [ ] Task 21: 实现 AI 伴读对话页
  - [ ] 21.1 实现 pages/aiChat/index.tsx：AI 伴读对话页
  - [ ] 21.2 实现 components/ChatBubble：聊天气泡组件
  - [ ] 21.3 实现会话列表展示
  - [ ] 21.4 实现历史消息加载
  - [ ] 21.5 实现降级提示（2001/2002 错误友好展示）
  - [ ] 21.6 Git commit + tag: `feat/ai-chat-page`

- [ ] Task 22: 编写 AI 域本地 Mock 测试（11B.6 全部条目）
  - [ ] 22.1 测试 LAI1：新会话创建
  - [ ] 22.2 测试 LAI2：消息落库
  - [ ] 22.3 测试 LAI3：上下文拼装顺序（system 在首、历史按时间、提问在末）
  - [ ] 22.4 测试 LAI4：system 注入书籍信息
  - [ ] 22.5 测试 LAI5：历史条数上限
  - [ ] 22.6 测试 LAI6：续聊（带已有 sessionId）
  - [ ] 22.7 测试 LAI7：超长限额返回 2002
  - [ ] 22.8 测试 LAI8：超频限额返回 2002
  - [ ] 22.9 测试 LAI9：异常兜底返回 2001
  - [ ] 22.10 测试 LAI10：假回复落库
  - [ ] 22.11 Git commit + tag: `test/ai-mock`

## 阶段五：笔记打卡域 + 相关页面

- [ ] Task 23: 实现笔记打卡域业务逻辑与云函数入口
  - [ ] 23.1 创建 cloud/functions/note/noteService.ts：纯业务函数（addNote、listNote、deleteNote、checkIn、checkInStat）
  - [ ] 23.2 创建 cloud/functions/note/index.ts：云函数入口
  - [ ] 23.3 Git commit + tag: `feat/note-domain`

- [ ] Task 24: 实现前端笔记打卡服务层与状态层
  - [ ] 24.1 创建 services/noteService.ts：笔记打卡域云函数调用封装
  - [ ] 24.2 创建 store/noteStore.ts：笔记打卡状态管理
  - [ ] 24.3 Git commit + tag: `feat/frontend-note-service`

- [ ] Task 25: 实现笔记打卡页面
  - [ ] 25.1 实现 pages/notes/index.tsx：我的笔记打卡页
  - [ ] 25.2 实现 components/NoteItem：笔记条目组件
  - [ ] 25.3 实现笔记添加、删除
  - [ ] 25.4 实现打卡功能与打卡统计展示
  - [ ] 25.5 Git commit + tag: `feat/notes-page`

- [ ] Task 26: 实现个人中心页面
  - [ ] 26.1 实现 pages/profile/index.tsx：个人中心页
  - [ ] 26.2 显示用户信息、管理员入口（按 role 条件）
  - [ ] 26.3 Git commit + tag: `feat/profile-page`

- [ ] Task 27: 编写笔记打卡域本地 Mock 测试
  - [ ] 27.1 测试：addNote 后内存库出现该记录
  - [ ] 27.2 测试：listNote 只返回本人笔记
  - [ ] 27.3 测试：deleteNote 删除本人笔记成功
  - [ ] 27.4 测试：读他人笔记返回 1005
  - [ ] 27.5 测试：checkIn 写入成功
  - [ ] 27.6 测试：checkInStat 返回连续天数与累计时长
  - [ ] 27.7 Git commit + tag: `test/note-mock`

## 阶段六：工程规范收尾 + 全量验收

- [ ] Task 28: 配置 app.config.ts（路由与 Tab 配置）
  - [ ] 28.1 配置页面路由
  - [ ] 28.2 配置底部 Tab（书单首页、AI 伴读入口、个人中心）
  - [ ] 28.3 Git commit + tag: `feat/app-config`

- [ ] Task 29: 前端本地模式走查
  - [ ] 29.1 切换到 local 模式
  - [ ] 29.2 模拟器走通主要页面交互
  - [ ] 29.3 Git commit + tag: `test/local-walkthrough`

- [ ] Task 30: 运行 tsc 与 ESLint 全量检查
  - [ ] 30.1 tsc 无报错
  - [ ] 30.2 ESLint 无 error 级问题
  - [ ] 30.3 修复所有问题
  - [ ] 30.4 Git commit + tag: `chore/lint-fix`

- [ ] Task 31: 编写环境变量清单与云开发初始化说明
  - [ ] 31.1 环境变量清单文档（只列字段名与用途，不含真实值）
  - [ ] 31.2 云开发环境初始化说明（集合、权限、索引）
  - [ ] 31.3 Git commit + tag: `docs/env-config`

- [ ] Task 32: 全量验收与自测报告
  - [ ] 32.1 对照 11.1 功能验收逐项走查
  - [ ] 32.2 对照 11.2 权限与安全验收逐项走查
  - [ ] 32.3 对照 11.3 AI 专项验收逐项走查
  - [ ] 32.4 对照 11.4 代码质量验收逐项走查
  - [ ] 32.5 对照 11B.2 本地 Mock 验证逐项走查
  - [ ] 32.6 Git commit + tag: `docs/acceptance-report`

# Task Dependencies

- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 3
- Task 5 depends on Task 4
- Task 6 depends on Task 4
- Task 7 depends on Task 4, Task 5, Task 6
- Task 8 depends on Task 2, Task 7
- Task 9 depends on Task 8
- Task 10 depends on Task 7, Task 5
- Task 11 depends on Task 4, Task 5, Task 6
- Task 12 depends on Task 2, Task 11
- Task 13 depends on Task 12
- Task 14 depends on Task 12
- Task 15 depends on Task 11, Task 5
- Task 16 depends on Task 12, Task 9
- Task 17 depends on Task 6, Task 16
- Task 18 depends on Task 11, Task 5
- Task 19 depends on Task 4, Task 5, Task 6
- Task 20 depends on Task 2, Task 19
- Task 21 depends on Task 20
- Task 22 depends on Task 19, Task 5
- Task 23 depends on Task 4, Task 5, Task 6
- Task 24 depends on Task 2, Task 23
- Task 25 depends on Task 24
- Task 26 depends on Task 8, Task 9
- Task 27 depends on Task 23, Task 5
- Task 28 depends on Task 13, Task 21, Task 26
- Task 29 depends on Task 28
- Task 30 depends on Task 29
- Task 31 depends on Task 30
- Task 32 depends on Task 31
