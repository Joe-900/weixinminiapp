# 校园阅读伴读小程序 · 验收检查清单

## 阶段一：项目骨架与全局契约

- [ ] Taro 项目初始化完成，TypeScript strict 模式开启
- [ ] ESLint + Prettier 配置完成，无 error 级问题
- [ ] 前端目录结构创建完整（pages、components、store、services、types、utils）
- [ ] 统一返回信封类型 ApiResponse 定义完成
- [ ] 统一错误码枚举 ErrorCode 定义完成（0/1001/1002/1003/1004/1005/2001/2002/5000）
- [ ] 前后端共享类型定义完成（User、Book、Note、Checkin、AiSession、AiMessage）
- [ ] 云函数全局契约代码完成（response、errors、validate、auth）
- [ ] 依赖注入抽象接口定义完成（Repository、Storage、AIClient）
- [ ] 本地 Mock 实现完成（memoryRepository、localStorage、mockAiClient）
- [ ] 云实现完成（cloudRepository、cloudStorage、openaiAiClient）
- [ ] 每个 Git commit 都已打标签

## 阶段一：登录与身份

- [ ] 用户域业务函数实现完成（login、profile）
- [ ] 用户域云函数入口实现完成
- [ ] 前端用户服务层实现完成
- [ ] 前端用户状态管理实现完成
- [ ] 前端本地模式桥接实现完成
- [ ] 静默登录流程走通（F1）
- [ ] 身份不可伪造验证通过（S6）
- [ ] AuthGuard 组件实现完成
- [ ] StateView 组件实现完成
- [ ] 用户域本地 Mock 测试全部通过

## 阶段二：书籍域

- [ ] 书籍域业务函数实现完成（list、detail、create、update、offline、online）
- [ ] 书籍域云函数入口实现完成
- [ ] 前端书籍服务层实现完成
- [ ] 前端书籍状态管理实现完成
- [ ] 书单首页实现完成，分页展示 online 书籍（F2）
- [ ] BookCard 组件实现完成
- [ ] 下拉刷新与上拉分页加载实现完成
- [ ] 书籍详情页实现完成（F3）
- [ ] 书籍域本地 Mock 测试全部通过

## 阶段三：管理员功能

- [ ] 管理员书籍管理页实现完成（F8）
- [ ] 新增书籍表单实现完成
- [ ] 编辑书籍功能实现完成
- [ ] 上下架操作实现完成（F9）
- [ ] AuthGuard 包裹管理员页面
- [ ] 封面图上传链路实现完成（选择图片→云存储上传→fileID 存库）
- [ ] 禁止外链 URL 作为封面
- [ ] 管理员域本地 Mock 测试全部通过
- [ ] 后端权限兜底验证通过（S1）

## 阶段四：AI 伴读

- [ ] AI 域业务函数实现完成（chat、loadHistory、listSessions）
- [ ] system prompt 模板实现完成（注入书名、作者、简介）
- [ ] 历史消息拼装逻辑实现完成（按时间升序，限制最近 N 条）
- [ ] 用量保护实现完成（单日次数上限、单次长度上限）
- [ ] 异常兜底实现完成（超时或报错返回 2001）
- [ ] AI 域云函数入口实现完成
- [ ] 前端 AI 服务层实现完成
- [ ] 前端 AI 状态管理实现完成
- [ ] AI 伴读对话页实现完成（F4）
- [ ] ChatBubble 组件实现完成
- [ ] 会话列表展示实现完成（F5）
- [ ] 历史消息加载实现完成
- [ ] 降级提示实现完成（2001/2002 友好展示）
- [ ] AI 域本地 Mock 测试全部通过（LAI1-LAI10）

## 阶段五：笔记打卡

- [ ] 笔记打卡域业务函数实现完成（addNote、listNote、deleteNote、checkIn、checkInStat）
- [ ] 笔记打卡域云函数入口实现完成
- [ ] 前端笔记打卡服务层实现完成
- [ ] 前端笔记打卡状态管理实现完成
- [ ] 笔记打卡页面实现完成（F6、F7）
- [ ] NoteItem 组件实现完成
- [ ] 打卡统计展示实现完成
- [ ] 个人中心页面实现完成
- [ ] 管理员入口按 role 条件显示
- [ ] 笔记打卡域本地 Mock 测试全部通过
- [ ] 数据隔离验证通过（S2）

## 阶段六：工程规范与全量验收

- [ ] app.config.ts 路由与 Tab 配置完成
- [ ] 底部 Tab 三个：书单首页、AI 伴读入口、个人中心
- [ ] 本地模式模拟器走通主要页面交互
- [ ] tsc 无报错，无 any 滥用（Q1）
- [ ] ESLint 无 error 级问题（Q2）
- [ ] 页面无直接调用云函数，均走 services（Q3）
- [ ] 前后端共享数据模型类型一致（Q4）
- [ ] 所有云函数遵守统一信封与错误码（Q5）
- [ ] 环境变量清单文档完成（不含真实值）
- [ ] 云开发环境初始化说明完成
- [ ] 密钥安全验证通过（S3）
- [ ] 集合权限验证通过（S4）
- [ ] 入参校验验证通过（S5）
- [ ] 全量验收报告完成

## 11B 本地 Mock 验证层

- [ ] 通信映射：前端 service 调用正确路由到对应 action 并拿到信封返回
- [ ] 入参校验：缺字段、错类型入参返回 1003 并指明字段
- [ ] 权限逻辑：普通用户调 create/offline/update 返回 1002
- [ ] 数据隔离：用户读非本人 note/session 返回 1005
- [ ] 入库逻辑：create 后内存库出现该记录，字段正确
- [ ] 状态变更：offline 后该书 status 变 offline 且记录仍在
- [ ] 列表过滤：list 只返回 status 为 online 的书
- [ ] 分页：page/pageSize 返回正确条数与 total
- [ ] 封面上传：本地 Storage 返回模拟 fileID，create 能正常存入 cover
- [ ] 身份不可伪造：业务函数只用注入的 openid，入参里的假 openid 被忽略
- [ ] AI 链路 LAI1-LAI10 全部通过

## Git 提交规范

- [ ] 每完成一个文件即 git commit
- [ ] 每次测试完成也 git commit
- [ ] 每次 commit 都已打标签，标签描述本次更改行为
