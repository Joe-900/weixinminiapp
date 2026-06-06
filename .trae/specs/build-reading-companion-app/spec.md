# 校园阅读伴读小程序 · 开发规格说明

## Why

面向中学的校园阅读伴读小程序，核心功能为精选书单、书籍详情、AI 阅读伴读、读书笔记与打卡。当前项目为空白状态，需要从零搭建完整的 Taro 小程序项目，包含前端页面、云函数后端、本地 Mock 测试层，并严格遵循 guidev1.md 的全部架构与约束要求。

## What Changes

- 初始化 Taro + React + TypeScript 项目骨架
- 搭建全局技术契约：统一返回信封、错误码、类型基座
- 实现前端目录结构（pages、components、store、services、types、utils）
- 实现云函数后端（user、book、note、ai 四个业务域）
- 实现数据库六集合（user、book、note、checkin、ai_session、ai_message）
- 实现依赖注入架构：Repository / Storage / AIClient 抽象接口 + 云实现 + 本地 Mock 实现
- 实现前端全部页面：书单首页、书籍详情、AI 伴读对话、笔记打卡、个人中心、管理员书籍管理
- 实现前端全部组件：BookCard、ChatBubble、NoteItem、StateView、AuthGuard
- 实现 AI 伴读模块：对话、会话历史、用量保护、异常兜底
- 实现本地 Mock 验证层与 Jest 测试集
- 每完成一个文件即 git commit，每次测试也 git commit，并打标签

## Impact

- Affected specs: 全部功能模块（用户、书籍、笔记、AI、管理）
- Affected code: 全部新建，无已有代码受影响

## ADDED Requirements

### Requirement: 项目骨架与全局契约

系统 SHALL 提供 Taro + React + TypeScript 项目骨架，包含：
- TypeScript strict 模式开启，禁止 any 兜底
- 统一返回信封结构 `{ code, message, data }`
- 统一错误码体系（0/1001/1002/1003/1004/1005/2001/2002/5000）
- 前后端共享类型定义（types 目录）
- ESLint + Prettier 配置

#### Scenario: 统一返回信封
- **WHEN** 云函数处理任意请求
- **THEN** 返回 `{ code: number, message: string, data: any | null }` 结构

#### Scenario: 错误码映射
- **WHEN** 发生权限不足
- **THEN** 返回 code=1002

### Requirement: 用户登录与身份

系统 SHALL 支持微信云开发静默登录：
- 前端调用 user.login，云函数从上下文获取 openid
- openid 不存在则创建 role=user 记录，存在则返回
- 前端不传 openid，后端只认上下文 openid
- 返回 openid 与 role 给前端缓存

#### Scenario: 首次登录
- **WHEN** 新用户首次进入
- **THEN** 自动创建 user 记录，role 为 user，返回 openid 与 role

#### Scenario: 身份不可伪造
- **WHEN** 前端伪造 openid 参数
- **THEN** 后端忽略该参数，只使用上下文 openid

### Requirement: 书籍域

系统 SHALL 提供书籍列表与详情功能：
- book.list：分页返回 status=online 的书籍，支持 keyword 搜索
- book.detail：返回单本书籍完整元数据
- book.create/update/offline/online：仅 admin 可操作
- 书籍只存元数据（书名、作者、ISBN、简介、封面），不存全文
- 封面使用云存储 fileID，禁止外链 URL

#### Scenario: 普通用户查看书单
- **WHEN** 登录用户访问书单首页
- **THEN** 分页展示 status=online 的书籍，封面正常加载

#### Scenario: 管理员创建书籍
- **WHEN** admin 调用 book.create
- **THEN** 创建成功返回 bookId

#### Scenario: 普通用户尝试创建书籍
- **WHEN** 非 admin 调用 book.create
- **THEN** 返回 code=1002

### Requirement: 笔记与打卡域

系统 SHALL 提供读书笔记与打卡功能：
- note.addNote：为指定书籍添加笔记
- note.listNote：分页查看本人笔记
- note.deleteNote：删除本人笔记
- note.checkIn：打卡记录阅读时长
- note.checkInStat：查看连续打卡天数与累计时长
- 所有操作仅限本人数据，越权返回 1005

#### Scenario: 添加笔记
- **WHEN** 用户为某本书添加笔记
- **THEN** 笔记保存成功，出现在"我的笔记"列表

#### Scenario: 越权访问
- **WHEN** 用户尝试读取他人笔记
- **THEN** 返回 code=1005

### Requirement: AI 伴读域

系统 SHALL 提供 AI 阅读伴读功能：
- ai.chat：基于书籍上下文的对话，支持多轮
- ai.loadHistory：加载会话历史消息
- ai.listSessions：查看会话列表
- system prompt 注入书籍信息（书名、作者、简介）
- 历史消息按时间升序，限制最近 N 条（默认 10）
- 用量保护：单用户单日上限（默认 50 次）、单次提问长度上限（默认 1000 字）
- 大模型 key 与 baseURL 仅存云函数环境变量
- 异常兜底：超时或报错返回 2001

#### Scenario: AI 对话
- **WHEN** 用户对某本书提问
- **THEN** 返回围绕该书的合理回复，多轮上下文连贯

#### Scenario: 超频限制
- **WHEN** 用户单日调用超过上限
- **THEN** 返回 code=2002 与友好提示

#### Scenario: 模型可替换
- **WHEN** 仅修改云函数环境变量
- **THEN** 可切换大模型，业务代码不变

### Requirement: 依赖注入与本地 Mock 层

系统 SHALL 实现业务逻辑与外部依赖解耦：
- 三类抽象接口：Repository（数据访问）、Storage（文件存储）、AIClient（AI 客户端）
- 每类接口提供云实现与本地 Mock 实现
- 业务函数通过注入的依赖操作数据，不直接调用云 SDK 或大模型 SDK
- 本地模式下全部依赖由本地假实现替换，不产生任何网络请求
- 前端服务层支持模式开关（local / cloud），切换不改业务代码

#### Scenario: 本地 Mock 验证
- **WHEN** 切换到 local 模式
- **THEN** 所有功能在纯本机跑通，不联网、不碰云、不调真实模型

#### Scenario: AI 本地假实现
- **WHEN** 本地模式下调用 AI 对话
- **THEN** 返回包含书名和提问的假回复，不发起网络请求

### Requirement: 管理员机制

系统 SHALL 支持管理员功能：
- 第一个 admin 由开发者在云开发控制台手动修改 user 集合 role 字段
- 前端管理入口仅 role=admin 时显示
- 真正权限拦截在云函数 role 校验
- 管理员可新增书籍、上传封面、上下架

#### Scenario: 管理员上架书籍
- **WHEN** admin 新增书籍并上传封面
- **THEN** 创建成功，封面使用云存储 fileID

#### Scenario: 管理员下架书籍
- **WHEN** admin 下架书籍
- **THEN** 书籍 status 变为 offline，数据未删除，可重新上架

### Requirement: Git 提交规范

系统 SHALL 在开发过程中遵守 Git 提交规范：
- 每完成一个文件即 git commit
- 每次测试完成也 git commit
- 每次 commit 打标签，标签描述本次更改的大致行为
- 标签格式示例：`feat/login`、`feat/book-list`、`test/ai-mock`、`fix/type-error`

#### Scenario: 文件完成提交
- **WHEN** 完成一个源代码文件
- **THEN** 执行 git add + git commit + git tag

#### Scenario: 测试完成提交
- **WHEN** 完成一组测试
- **THEN** 执行 git add + git commit + git tag

### Requirement: 前端页面与组件

系统 SHALL 实现以下页面与组件：
- 页面：home（书单首页）、bookDetail（书籍详情）、aiChat（AI 伴读对话）、notes（我的笔记打卡）、profile（个人中心）、admin（管理员书籍管理）
- 组件：BookCard（书籍卡片）、ChatBubble（聊天气泡）、NoteItem（笔记条目）、StateView（空态与加载）、AuthGuard（权限包裹组件）
- 底部 Tab 三个：书单首页、AI 伴读入口、个人中心
- 所有列表页实现下拉刷新与上拉分页加载
- 统一用 StateView 处理空态、加载中、加载失败

#### Scenario: 书单首页交互
- **WHEN** 用户进入书单首页
- **THEN** 分页展示书籍卡片，支持下拉刷新与上拉加载

#### Scenario: 管理员入口
- **WHEN** admin 用户进入个人中心
- **THEN** 显示管理员入口，可进入书籍管理页

### Requirement: 入参校验

系统 SHALL 在每个 action 进入业务逻辑前校验入参：
- 缺失或类型错误返回 1003 并说明哪个字段
- 不得让云函数抛未捕获异常

#### Scenario: 缺失必填字段
- **WHEN** 调用 book.create 缺少 title
- **THEN** 返回 code=1003，message 说明 "title 字段缺失"

### Requirement: 封面图上传链路

系统 SHALL 提供封面图上传功能：
- 管理员选择本地图片
- 前端调用云存储上传，拿到 fileID
- fileID 作为 cover 字段存入数据库
- 禁止外链图片 URL 当封面入库

#### Scenario: 封面上传
- **WHEN** 管理员上传封面图
- **THEN** 图片上传至云存储，fileID 存入 book 记录

## MODIFIED Requirements

无（全新项目）

## REMOVED Requirements

无（全新项目）
