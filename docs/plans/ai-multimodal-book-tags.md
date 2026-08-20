# AI 对话、图片提问与管理员图书标签实施记录

## 目标

在不改变现有 Taro/CloudBase 分层的前提下，完成三个相互独立的功能提交：

1. OpenAI 兼容的 ShuaiAPI 文本连续对话；
2. 微信图片上传、历史图片上下文和多模态对话；
3. 管理员维护图书元数据标签，并支持用户侧展示与筛选。

API 密钥只允许通过云函数运行时的 `AI_API_KEY` 环境变量注入，不写入仓库、前端产物、日志、测试输出或命令行参数。非敏感配置为 `AI_BASE_URL=https://api.shuaiapi.com/v1`、`AI_MODEL=qwen3.7-flash`。

## 已核实的可复用模块

- `cloud/functions/ai/aiService.ts`：单书会话、最近历史和请求校验。
- `cloud/functions/cloud/openaiAiClient.ts`：OpenAI Chat Completions 适配。
- `src/services/uploadService.ts`、`cloud/functions/cloud/cloudStorage.ts`：微信图片选择和云存储。
- `src/types/book.ts`、`cloud/functions/interfaces/repository.ts`、书籍服务和三套 Repository：图书元数据查询、创建、更新。
- `src/pages/aiChat/`、`src/pages/admin/`、`src/pages/home/`、`src/pages/bookDetail/`：现有页面入口。

## 冻结接口

### AI

`chat(request: ChatParams) -> ApiResponse<ChatResult>` 保持既有签名。书名或 `bookId` 必填；文本问题必填，带图片时允许空问题并使用明确的默认问题；图片仍使用同一个 OpenAI 多模态请求，不增加独立 OCR Provider。历史最多读取 `AI_HISTORY_LIMIT`（默认 10）条，历史图片需要重新解析为临时 URL。

### 图书标签

`Book.tags?: string[]`，`BookListParams.tag?: string`。服务端统一校验：去首尾空白、忽略空值、去重、最多 2 个、单个最多 20 个字符；仅管理员可以在创建、更新和元数据导入后修改。标签只用于展示和筛选，不注入 AI 提示词。

## 实施顺序

### 阶段一：文本 Provider

- 核对并补充 ShuaiAPI 非敏感环境变量示例和错误映射；
- 保持 API Key 仅由 `process.env.AI_API_KEY` 读取；
- 使用本机临时探针做一次非敏感文本响应验证（探针位于被忽略的 `.temp/`，不入 Git）；
- 补充请求地址、模型、历史上限、上下文和密钥隔离测试；
- 运行测试、类型检查、Lint、微信构建和 Cloud 函数检查；
- 提交：`接入 ShuaiAPI 文本伴读`。

### 阶段二：图片与多模态

- 保持 `Taro.chooseMedia` 只接收图片；
- 上传云存储并保存 `fileId`/MIME；
- 为当前和历史图片生成临时 URL，发送文本 part + `image_url` part；
- 处理上传、临时 URL 和 Provider 图片能力错误；
- 补充本地 Mock 多模态测试，不在前端暴露密钥；
- 提交：`完善伴读图片上传与多模态请求`。

### 阶段三：管理员图书标签

- 在共享类型、Repository、Mock/Cloud 实现和书籍云函数中加入标签字段及标签过滤；
- 管理员页提供两个标签输入，服务端再次校验权限和规则；
- 书单卡片、详情页展示标签，书单支持标签与现有关键词、排序、分页组合；
- 补充 0/1/2 标签、去重、超长、第三标签和非管理员拒绝测试；
- 提交：`增加管理员图书标签管理`。

## 验证与提交边界

每个阶段分别执行：

```text
npm test -- --runInBand
npm run typecheck
npm run lint
npm run build:weapp
npm run build:cloud:check
```

阶段提交只包含本阶段文件，`demo.zip` 始终保持原样且不加入 Git。最终验收包括文本连续会话、图片多模态及历史上下文、管理员标签权限和筛选、前端不含密钥、Mock 不联网、微信构建和 Cloud 函数打包全部通过。

## 未在本轮假设的外部条件

- 真实 CloudBase 环境、正式 AppID 和图书馆预约授权不作为本轮实现前置条件；
- 真实 Provider 图片支持若不存在，必须返回明确的“不支持图片输入”错误，不改变文本链路；
- 不保存书籍正文、整本扫描件或未授权章节内容。
