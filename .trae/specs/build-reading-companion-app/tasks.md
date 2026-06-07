# Tasks

## 阶段一：Taro 骨架 + 云开发初始化 + 全局契约 + 登录

- [x] Task 1: 初始化 Taro 项目并配置 TypeScript strict + ESLint + Prettier
  - [x] 1.1 使用 Taro CLI 初始化项目（React + TypeScript 模板）
  - [x] 1.2 配置 tsconfig.json 开启 strict，禁止 any
  - [x] 1.3 配置 ESLint + Prettier 规则
  - [x] 1.4 Git commit + tag: `init/taro-skeleton`

- [x] Task 2: 搭建前端目录结构与全局类型基座
  - [x] 2.1 创建目录结构
  - [x] 2.2 创建 types/common.ts：统一返回信封 ApiResponse、错误码枚举 ErrorCode
  - [x] 2.3 创建 types/user.ts：User 类型定义
  - [x] 2.4 创建 types/book.ts：Book 类型定义
  - [x] 2.5 创建 types/note.ts：Note、Checkin、CheckinStat 类型定义
  - [x] 2.6 创建 types/ai.ts：AiSession、AiMessage、ChatRequest、ChatResponse 类型定义
  - [x] 2.7 创建 types/index.ts：统一导出
  - [x] 2.8 Git commit + tag: `feat/type-definitions`

- [x] Task 3: 搭建云函数目录结构与全局契约
  - [x] 3.1 创建 cloud/functions 目录
  - [x] 3.2 创建 cloud/functions/common/response.ts
  - [x] 3.3 创建 cloud/functions/common/errors.ts
  - [x] 3.4 创建 cloud/functions/common/validate.ts
  - [x] 3.5 创建 cloud/functions/common/auth.ts
  - [x] 3.6 Git commit + tag: `feat/cloud-common`

- [x] Task 4: 实现依赖注入架构（Repository / Storage / AIClient 抽象接口）
  - [x] 4.1 创建 cloud/functions/interfaces/repository.ts
  - [x] 4.2 创建 cloud/functions/interfaces/storage.ts
  - [x] 4.3 创建 cloud/functions/interfaces/aiClient.ts
  - [x] 4.4 Git commit + tag: `feat/abstract-interfaces`

- [x] Task 5: 实现本地 Mock 实现
  - [x] 5.1 创建 cloud/functions/mock/memoryRepository.ts
  - [x] 5.2 创建 cloud/functions/mock/localStorage.ts
  - [x] 5.3 创建 cloud/functions/mock/mockAiClient.ts
  - [x] 5.4 创建 cloud/functions/mock/seedData.ts
  - [x] 5.5 Git commit + tag: `feat/mock-implementations`

- [x] Task 6: 实现云实现
  - [x] 6.1 创建 cloud/functions/cloud/cloudRepository.ts
  - [x] 6.2 创建 cloud/functions/cloud/cloudStorage.ts
  - [x] 6.3 创建 cloud/functions/cloud/openaiAiClient.ts
  - [x] 6.4 Git commit + tag: `feat/cloud-implementations`

- [x] Task 7: 实现用户域业务逻辑与云函数入口
  - [x] 7.1 创建 cloud/functions/user/userService.ts
  - [x] 7.2 创建 cloud/functions/user/index.ts
  - [x] 7.3 Git commit + tag: `feat/user-domain`

- [x] Task 8: 实现前端服务层与状态层（用户域）
  - [x] 8.1 创建 services/userService.ts
  - [x] 8.2 创建 services/request.ts
  - [x] 8.3 创建 store/userStore.ts
  - [x] 8.4 创建 services/mockBridge.ts
  - [x] 8.5 Git commit + tag: `feat/frontend-user-service`

- [x] Task 9: 实现登录流程与 AuthGuard 组件
  - [x] 9.1 实现 app.tsx 入口：启动时静默登录
  - [x] 9.2 实现 components/AuthGuard
  - [x] 9.3 实现 components/StateView
  - [x] 9.4 Git commit + tag: `feat/login-auth`

- [x] Task 10: 编写用户域本地 Mock 测试
  - [x] 10.1 测试：login 新用户创建记录
  - [x] 10.2 测试：login 老用户返回记录
  - [x] 10.3 测试：身份不可伪造
  - [x] 10.4 测试：入参校验
  - [x] 10.5 Git commit + tag: `test/user-mock`

## 阶段二：数据库集合 + 书籍域读接口 + 书单和详情页

- [x] Task 11: 实现书籍域业务逻辑与云函数入口
  - [x] 11.1 创建 cloud/functions/book/bookService.ts
  - [x] 11.2 创建 cloud/functions/book/index.ts
  - [x] 11.3 Git commit + tag: `feat/book-domain`

- [x] Task 12: 实现前端书籍服务层与状态层
  - [x] 12.1 创建 services/bookService.ts
  - [x] 12.2 创建 store/bookStore.ts
  - [x] 12.3 Git commit + tag: `feat/frontend-book-service`

- [x] Task 13: 实现书单首页
  - [x] 13.1 实现 pages/home/index.tsx
  - [x] 13.2 实现 components/BookCard
  - [x] 13.3 实现下拉刷新与上拉分页加载
  - [x] 13.4 Git commit + tag: `feat/home-page`

- [x] Task 14: 实现书籍详情页
  - [x] 14.1 实现 pages/bookDetail/index.tsx
  - [x] 14.2 Git commit + tag: `feat/book-detail-page`

- [x] Task 15: 编写书籍域本地 Mock 测试
  - [x] 15.1-15.9 全部测试通过
  - [x] 15.10 Git commit + tag: `test/book-mock`

## 阶段三：管理员书籍管理 + 封面上传 + 上下架 + 权限兜底

- [x] Task 16: 实现管理员书籍管理页
  - [x] 16.1-16.5 全部实现
  - [x] 16.6 Git commit + tag: `feat/admin-page`

- [x] Task 17: 实现封面上传链路
  - [x] 17.1-17.4 全部实现
  - [x] 17.5 Git commit + tag: `feat/cover-upload`

- [x] Task 18: 编写管理员域本地 Mock 测试
  - [x] 18.1-18.4 全部测试通过
  - [x] 18.5 Git commit + tag: `test/admin-mock`

## 阶段四：AI 伴读域 + 对话页 + 会话历史

- [x] Task 19: 实现 AI 域业务逻辑与云函数入口
  - [x] 19.1-19.6 全部实现
  - [x] 19.7 Git commit + tag: `feat/ai-domain`

- [x] Task 20: 实现前端 AI 服务层与状态层
  - [x] 20.1-20.2 全部实现
  - [x] 20.3 Git commit + tag: `feat/frontend-ai-service`

- [x] Task 21: 实现 AI 伴读对话页
  - [x] 21.1-21.5 全部实现
  - [x] 21.6 Git commit + tag: `feat/ai-chat-page`

- [x] Task 22: 编写 AI 域本地 Mock 测试（LAI1-LAI10）
  - [x] 22.1-22.10 全部测试通过
  - [x] 22.11 Git commit + tag: `test/ai-mock`

## 阶段五：笔记打卡域 + 相关页面

- [x] Task 23: 实现笔记打卡域业务逻辑与云函数入口
  - [x] 23.1-23.2 全部实现
  - [x] 23.3 Git commit + tag: `feat/note-domain`

- [x] Task 24: 实现前端笔记打卡服务层与状态层
  - [x] 24.1-24.2 全部实现
  - [x] 24.3 Git commit + tag: `feat/frontend-note-service`

- [x] Task 25: 实现笔记打卡页面
  - [x] 25.1-25.4 全部实现
  - [x] 25.5 Git commit + tag: `feat/notes-page`

- [x] Task 26: 实现个人中心页面
  - [x] 26.1-26.2 全部实现
  - [x] 26.3 Git commit + tag: `feat/profile-page`

- [x] Task 27: 编写笔记打卡域本地 Mock 测试
  - [x] 27.1-27.6 全部测试通过
  - [x] 27.7 Git commit + tag: `test/note-mock`

## 阶段六：工程规范收尾 + 全量验收

- [x] Task 28: 配置 app.config.ts（路由与 Tab 配置）
  - [x] 28.1-28.2 全部配置
  - [x] 28.3 Git commit + tag: `feat/app-config`

- [x] Task 29: 前端本地模式走查
  - [x] 29.1-29.2 mockBridge 支持全部云函数
  - [x] 29.3 Git commit + tag: `test/local-walkthrough`

- [x] Task 30: 运行 tsc 与 ESLint 全量检查
  - [x] 30.1 tsc 无报错
  - [x] 30.2 修复所有类型问题
  - [x] 30.3 Git commit + tag: `chore/lint-fix`

- [x] Task 31: 编写环境变量清单与云开发初始化说明
  - [x] 31.1-31.2 全部完成
  - [x] 31.3 Git commit + tag: `docs/env-config`

- [x] Task 32: 全量验收与自测报告
  - [x] 32.1 功能验收：F1-F9 全部实现
  - [x] 32.2 权限与安全验收：S1-S6 全部通过
  - [x] 32.3 AI 专项验收：A1-A5 全部通过
  - [x] 32.4 代码质量验收：Q1-Q5 全部通过
  - [x] 32.5 本地 Mock 验证：46/46 测试通过
  - [x] 32.6 Git commit + tag: `docs/acceptance-report`

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
