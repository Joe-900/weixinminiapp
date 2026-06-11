# 书香摆渡预约系统 - 技术文档

## 一、项目概述

本项目是一个基于 Taro + React + TypeScript 的微信小程序预约系统，用于图书预约功能。

### 技术栈

| 分类 | 技术 | 版本 |
|------|------|------|
| 框架 | Taro | 4.2.0 |
| 语言 | TypeScript | 5.x |
| 状态管理 | Zustand | 4.x |
| 样式 | SCSS | - |
| 构建工具 | Webpack | - |

---

## 二、目录结构

```
src/
├── components/          # 公共组件
├── pages/              # 页面
│   └── reservation/    # 预约模块
│       ├── index.tsx   # 预约首页
│       ├── search.tsx  # 图书搜索页
│       ├── detail.tsx  # 图书详情页
│       ├── my.tsx      # 我的预约页
│       └── status.tsx  # 预约状态页
├── services/           # API服务层
│   └── reservationService.ts
├── store/              # 状态管理
│   └── reservationStore.ts
├── types/              # 类型定义
│   └── reservation.ts
├── utils/              # 工具函数
│   ├── fieldMapping.ts      # 字段映射工具
│   ├── dataValidator.ts     # 数据校验工具
│   └── __tests__/           # 单元测试
├── mock/               # Mock数据
│   └── reservationMock.ts
└── styles/             # 全局样式
```

---

## 三、核心功能模块

### 3.1 图书搜索模块

**文件**: `src/pages/reservation/search.tsx`

**功能**:
- 关键词搜索（书名、作者、ISBN）
- 校区筛选（沙河校区、西土城校区）
- 实时搜索结果展示

**搜索逻辑**:
```typescript
const filteredBooks = useMemo(() => {
  return books.filter(book => {
    const matchKeyword = !keyword || 
      book.title.includes(keyword) ||
      book.author.includes(keyword) ||
      book.isbn.includes(keyword)
    const matchCampus = !filterCampus || book.campus === filterCampus
    return matchKeyword && matchCampus
  })
}, [books, keyword, filterCampus])
```

### 3.2 预约详情模块

**文件**: `src/pages/reservation/detail.tsx`

**功能**:
- 展示图书详细信息
- 显示馆藏状态（库存、可借数量、状态）
- 一键预约功能

**预约流程**:
1. 用户选择图书 → 查看详情 → 点击"确认预约"
2. 调用 `createReservation` API
3. 预约成功后跳转"我的预约"页

### 3.3 我的预约模块

**文件**: `src/pages/reservation/my.tsx`

**功能**:
- 展示进行中的预约列表
- 展示历史预约记录
- 支持取消预约操作

### 3.4 数据校验模块

**文件**: `src/utils/dataValidator.ts`

**功能**:
- 图书数据校验
- 预约数据校验
- 数据一致性比对

**校验规则**:
| 字段 | 校验规则 |
|------|---------|
| ISBN | 必须符合ISBN-10或ISBN-13格式 |
| campus | 只能是 `shahe` 或 `xitu` |
| inventory | 非负整数 |
| availableCount | 非负整数且不大于库存 |
| status | 有效的图书状态值 |

---

## 四、数据结构

### 4.1 Book（图书）

```typescript
interface Book {
  bookId: string           // 图书ID
  title: string            // 书名
  author: string           // 作者
  isbn: string             // ISBN编号
  publisher: string        // 出版社
  publishDate?: string     // 出版日期(新增)
  callNumber: string       // 索书号
  stackType: StackType     // 书库类型
  campus: string           // 校区(shahe/xitu)
  status: BookStatus       // 馆藏状态
  inventory: number        // 总库存
  availableCount: number   // 可借数量
  cover?: string           // 封面URL
  summary?: string         // 简介
}
```

### 4.2 Reservation（预约）

```typescript
interface Reservation {
  reservationId: string    // 预约ID
  bookId: string           // 图书ID
  bookName: string         // 图书名称
  isbn: string             // ISBN
  userId: string           // 用户ID
  userName: string         // 用户姓名
  userPhone: string        // 用户手机号
  userEmail?: string       // 用户邮箱
  reservationType: string  // 预约类型
  campus: string           // 校区
  status: string           // 预约状态
  position: number         // 队列位置
  estimatedTime?: string   // 预计处理时间
  pickupLocation: string   // 取书地点
  createdAt: number        // 创建时间
  updatedAt: number        // 更新时间
}
```

---

## 五、API 接口

### 5.1 图书搜索

**接口**: `POST /api/reservation/search`

**请求参数**:
```typescript
{
  keyword?: string   // 搜索关键词
  campus?: string    // 校区筛选
  page: number       // 页码
  pageSize: number   // 每页数量
}
```

**响应结构**:
```typescript
{
  code: number
  message: string
  data: {
    list: Book[]
    total: number
  }
}
```

### 5.2 创建预约

**接口**: `POST /api/reservation/create`

**请求参数**:
```typescript
{
  bookId: string     // 图书ID
  bookName: string   // 图书名称
  isbn: string       // ISBN
  campus: string     // 校区
}
```

**响应结构**:
```typescript
{
  code: number
  message: string
  data: Reservation
}
```

### 5.3 获取预约列表

**接口**: `POST /api/reservation/list`

**请求参数**:
```typescript
{
  status?: string    // 状态筛选
  page: number       // 页码
  pageSize: number   // 每页数量
}
```

---

## 六、字段映射配置

**文件**: `src/utils/fieldMapping.ts`

用于统一爬虫与前端的数据结构转换。

### 映射规则

| 爬虫字段 | 前端字段 | 转换说明 |
|---------|---------|---------|
| recCtrlId | bookId | 直接映射 |
| authors | author | 直接映射 |
| isbnIssn | isbn | 直接映射 |
| holdingsCount | inventory | 转为数字 |
| availableCount | availableCount | 转为数字 |
| materialType | status | 类型转换 |

---

## 七、校区配置

当前系统支持以下校区：

| 校区ID | 校区名称 | 地址 |
|--------|---------|------|
| shahe | 沙河校区 | 北京市昌平区沙河高教园 |
| xitu | 西土城校区 | 北京市海淀区学院路15号 |

---

## 八、单元测试

### 测试文件

| 文件 | 测试内容 |
|------|---------|
| `fieldMapping.test.ts` | 字段映射工具测试 |
| `dataValidator.test.ts` | 数据校验工具测试 |

### 测试覆盖

| 测试类型 | 覆盖内容 |
|---------|---------|
| 字段映射 | 数据转换、必填字段校验 |
| 图书校验 | ISBN格式、校区有效性、库存逻辑 |
| 预约校验 | 手机号格式、时间戳顺序 |
| 数据比对 | 字段差异检测 |

---

## 九、部署说明

### 开发环境

```bash
# 安装依赖
npm install

# 开发模式
npm run dev:weapp

# 构建生产版本
npm run build:weapp
```

### 微信开发者工具

1. 打开微信开发者工具
2. 导入项目：选择 `dist` 目录
3. 配置小程序 AppID

---

## 十、版本历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v1.0.0 | 2026-06 | 初始版本 |
| v1.0.1 | 2026-06 | 修复校区ID硬编码问题 |
| v1.0.2 | 2026-06 | 添加publishDate字段 |
| v1.0.3 | 2026-06 | 修复搜索功能API对接 |
| v1.0.4 | 2026-06 | 添加字段映射和数据校验工具 |
| v1.0.5 | 2026-06 | 优化预约流程用户体验 |

---

## 十一、注意事项

1. **数据一致性**: 所有图书的 `campus` 字段必须是 `shahe` 或 `xitu`
2. **ISBN格式**: 必须符合标准ISBN-10或ISBN-13格式
3. **库存逻辑**: `availableCount` 不能大于 `inventory`
4. **时间戳**: `updatedAt` 必须大于等于 `createdAt`
