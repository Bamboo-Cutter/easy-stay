# Easy-Stay Hotel Backend

本仓库当前以 **后端 API 服务** 为主（NestJS + Prisma + PostgreSQL）。

## 1. 技术栈
- Node.js + TypeScript
- NestJS
- Prisma ORM
- PostgreSQL (Docker)
- pnpm

## 2. 目录说明
- `apps/api/src`：后端业务代码
- `apps/api/prisma/schema.prisma`：数据库模型定义
- `apps/api/test/app.e2e-spec.ts`：端到端测试
- `docker-compose.yml`：本地 PostgreSQL 启动配置

## 3. 环境准备
要求：
- Node.js 20+
- pnpm
- Docker Desktop

## 4. 本地启动步骤
### 4.1 启动数据库
在仓库根目录执行：

```bash
docker compose up -d
```

### 4.2 安装依赖

```bash
pnpm -C apps/api install
```

### 4.3 配置环境变量
后端使用：
- `apps/api/.env`（开发环境）
- `apps/api/.env.test`（e2e 环境）

核心变量：

```env
DATABASE_URL="postgresql://hotel:hotel123@localhost:5432/hotel_booking?schema=public"
JWT_SECRET="dev_secret_change_me"
JWT_EXPIRES_IN="7d"
```

### 4.4 同步数据库结构

```bash
pnpm -C apps/api exec dotenv -e .env.test -- prisma db push
```

### 4.5 启动服务

```bash
pnpm -C apps/api start:dev
```

默认地址：`http://localhost:3000`

## 5. 常用命令
```bash
# 构建
pnpm -C apps/api build

# 代码检查
pnpm -C apps/api lint

# e2e 测试
pnpm -C apps/api test:e2e
```

## 6. 当前后端功能范围
### 6.1 认证与角色
- 商户 / 管理员注册登录
- JWT 鉴权
- 角色权限控制

### 6.2 商户侧
- 酒店录入、编辑、提交审核
- 图片/标签维护
- 房型创建
- 房型价格日历维护

### 6.3 管理员侧
- 待审核酒店列表
- 审核通过/拒绝
- 房型库存日历查询与设置

### 6.4 C 端公开查询
- 酒店列表
- 酒店详情
- 房型价格日历
- 房型区间可用库存查询

### 6.5 预订流程
- 创建预订（校验库存并扣减）
- 查询预订详情
- 取消预订（释放库存）

## 7. 数据模型总览
核心表：
- `users`
- `hotels`
- `rooms`
- `price_calendar`
- `room_inventory_daily`
- `bookings`
- 以及酒店扩展表：`hotel_images` / `hotel_tags` / `nearby_points` / `review_summary`

说明：
- 库存按 `room_id + date` 管理（`room_inventory_daily`）
- 价格按 `room_id + date` 管理（`price_calendar`）
- `rooms.max_occupancy` 表示每间可住人数
- `rooms.total_rooms` 表示该房型总间数

### 7.1 ER 图
优先查看图片版（根目录）：

![ER 图](./er.png)

也提供 Mermaid 文本版（部分平台可直接渲染）：

```mermaid
erDiagram
  users ||--o{ hotels : "merchant_id"
  users ||--o{ bookings : "user_id"
  hotels ||--o{ hotel_images : "hotel_id"
  hotels ||--o{ hotel_tags : "hotel_id"
  hotels ||--o{ rooms : "hotel_id"
  hotels ||--o{ nearby_points : "hotel_id"
  hotels ||--|| review_summary : "hotel_id(unique)"
  hotels ||--o{ bookings : "hotel_id"
  rooms ||--o{ price_calendar : "room_id"
  rooms ||--o{ room_inventory_daily : "room_id"
  rooms ||--o{ bookings : "room_id"

  users {
    string id PK
    string email UNIQUE
    string password
    enum role
    datetime created_at
  }

  hotels {
    string id PK
    string name_cn
    string name_en
    string address
    string city
    int star
    string type
    int open_year
    enum status
    string reject_reason
    string merchant_id FK
    datetime created_at
    datetime updated_at
  }

  rooms {
    string id PK
    string hotel_id FK
    string name
    int max_occupancy
    int total_rooms
    int base_price
    boolean refundable
    boolean breakfast
  }

  price_calendar {
    string id PK
    string room_id FK
    datetime date
    int price
    string promo_type
    int promo_value
  }

  room_inventory_daily {
    string id PK
    string room_id FK
    datetime date
    int total_rooms
    int reserved_rooms
    int blocked_rooms
  }

  bookings {
    string id PK
    string user_id FK
    string hotel_id FK
    string room_id FK
    datetime check_in
    datetime check_out
    int rooms_count
    int guest_count
    int total_amount
    enum status
    string contact_name
    string contact_phone
    datetime created_at
    datetime updated_at
  }
```

## 8. 主要 API
- Health: `GET /health`
- Auth: `POST /auth/register` / `POST /auth/login` / `GET /auth/me` / `POST /auth/logout`
- Merchant:
  - `GET /merchant/me`
  - `GET /merchant/hotels`
  - `POST /merchant/hotels`
  - `PATCH /merchant/hotels/:id`
  - `POST /merchant/hotels/:id/images`
  - `POST /merchant/hotels/:id/tags`
  - `POST /merchant/hotels/:id/rooms`
  - `POST /merchant/rooms/:roomId/prices`
- Admin:
  - `GET /admin/hotels/pending`
  - `POST /admin/hotels/:id/approve`
  - `POST /admin/hotels/:id/reject`
  - `GET /admin/rooms/:roomId/inventory`
  - `POST /admin/rooms/:roomId/inventory`
- Hotels (Public):
  - `GET /hotels`
  - `GET /hotels/:id`
  - `GET /hotels/rooms/:roomId/prices`
  - `GET /hotels/rooms/:roomId/availability`
- Bookings:
  - `POST /bookings`
  - `GET /bookings/:id`
  - `PATCH /bookings/:id/cancel`

## 9. 上传 Git 前检查清单
建议按顺序执行：

```bash
pnpm -C apps/api lint
pnpm -C apps/api build
pnpm -C apps/api test:e2e
```

三项都通过后再提交。

## 10. API 文档（详细版）
Base URL：`http://localhost:3000`

### 10.1 通用约定
1. 鉴权
- 需要登录的接口请带请求头：`Authorization: Bearer <access_token>`

2. 日期字段
- 本项目库存和价格都按“天”处理，建议传 ISO8601（如 `2026-02-10T00:00:00.000Z`）。
- `check_out` 为离店日，不计入入住夜晚库存。

3. 错误响应
- 由 Nest 默认异常格式返回，常见字段：`statusCode`、`message`、`error`。

4. 常见状态码
- `200`：查询/更新成功
- `201`：创建成功
- `400`：参数校验失败或业务校验失败（如库存不足）
- `401`：未登录/Token 无效
- `403`：角色无权限或资源不属于当前用户
- `404`：资源不存在

### 10.2 权限矩阵
| 接口前缀 | 访问角色 |
|---|---|
| `/health` | 公开 |
| `/auth/*` | `register/login` 公开，`me/logout` 需登录 |
| `/merchant/*` | `MERCHANT` / `ADMIN` |
| `/admin/*` | `ADMIN` |
| `/hotels/*` | 公开 |
| `/bookings/*` | 公开（当前实现未强制登录） |

### 10.3 Health
1. `GET /health`
- 说明：服务健康检查
- 响应：
```json
{ "status": "ok" }
```

### 10.4 Auth
1. `POST /auth/register`
- 字段：
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| email | string(email) | 是 | 账号邮箱（唯一） |
| password | string | 是 | 最少 6 位 |
| role | `MERCHANT`/`ADMIN` | 否 | 不传默认 `MERCHANT` |

2. `POST /auth/login`
- 字段：
| 字段 | 类型 | 必填 |
|---|---|---|
| email | string(email) | 是 |
| password | string | 是 |
- 响应示例：
```json
{
  "access_token": "xxx",
  "user": { "id": "u1", "email": "merchant_demo@test.com", "role": "MERCHANT" }
}
```

3. `GET /auth/me`（需登录）  
4. `POST /auth/logout`（需登录）

### 10.5 Merchant（商户端）
1. `GET /merchant/me`
2. `GET /merchant/hotels`
3. `POST /merchant/hotels`
- 字段：
| 字段 | 类型 | 必填 |
|---|---|---|
| name_cn | string | 是 |
| name_en | string | 否 |
| address | string | 是 |
| city | string | 是 |
| star | int | 是 |
| type | string | 是 |
| open_year | int | 是 |
| status | `DRAFT/PENDING/APPROVED/REJECTED/OFFLINE` | 否 |

4. `PATCH /merchant/hotels/:id`
- 说明：更新酒店资料，也可把状态改为 `PENDING` 提交审核。

5. `POST /merchant/hotels/:id/images`
- 字段：
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| items | array | 是 | 覆盖写入 |
| items[].url | string | 是 | 图片地址 |
| items[].sort | int | 是 | 排序值 |

6. `POST /merchant/hotels/:id/tags`
- 字段：
| 字段 | 类型 | 必填 |
|---|---|---|
| tags | string[] | 是 |

7. `POST /merchant/hotels/:id/rooms`
- 字段：
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| name | string | 是 | 房型名 |
| max_occupancy | int | 是 | 每间可住人数 |
| total_rooms | int | 是 | 该房型总间数 |
| base_price | int | 是 | 基础价 |
| refundable | boolean | 是 | 是否可退 |
| breakfast | boolean | 是 | 是否含早 |

8. `POST /merchant/rooms/:roomId/prices`
- 字段：
| 字段 | 类型 | 必填 |
|---|---|---|
| date | ISO8601 | 是 |
| price | int | 是 |
| promo_type | string | 否 |
| promo_value | int | 否 |

### 10.6 Admin（管理端）
1. `GET /admin/hotels/pending`
- 说明：查询待审核酒店

2. `POST /admin/hotels/:id/approve`
- 说明：审核通过；并初始化该酒店房型的未来库存日历。

3. `POST /admin/hotels/:id/reject`
- 字段：
| 字段 | 类型 | 必填 |
|---|---|---|
| reason | string | 否（默认 `rejected`） |

4. `GET /admin/rooms/:roomId/inventory?from=...&to=...`
- 说明：查询房型库存日历（返回 `available_rooms`）。

5. `POST /admin/rooms/:roomId/inventory`
- 字段：
| 字段 | 类型 | 必填 |
|---|---|---|
| date | ISO8601 | 是 |
| total_rooms | int | 否 |
| blocked_rooms | int | 否 |

### 10.7 Hotels（C 端公开查询）
1. `GET /hotels`
- 查询参数：
| 参数 | 类型 | 必填 | 默认 |
|---|---|---|---|
| city | string | 否 | - |
| keyword | string | 否 | - |
| page | int | 否 | 1 |
| limit | int | 否 | 20 |

2. `GET /hotels/:id`
- 可选参数：`check_in`、`check_out`、`rooms_count`
- 当传入住区间时，响应包含 `room_price_list`（按价格排序并带可售房量）。

3. `GET /hotels/rooms/:roomId/prices`
- 参数：`from`、`to`（可选）

4. `GET /hotels/rooms/:roomId/availability`
- 参数：
| 参数 | 类型 | 必填 |
|---|---|---|
| check_in | ISO8601 | 否 |
| check_out | ISO8601 | 否 |
| rooms_count | int | 否（默认 1） |

### 10.8 Bookings（预订）
1. `POST /bookings`
- 字段：
| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| hotel_id | string | 是 | 酒店 ID |
| room_id | string | 是 | 房型 ID |
| check_in | ISO8601 | 是 | 入住日 |
| check_out | ISO8601 | 是 | 离店日 |
| rooms_count | int | 是 | 预订间数 |
| guest_count | int | 是 | 入住人数 |
| contact_name | string | 是 | 联系人 |
| contact_phone | string | 是 | 联系电话 |
| user_id | string | 否 | 登录用户 ID（当前可不传） |

- 关键业务规则：
1. 仅 `APPROVED` 酒店可下单。
2. 按入住区间逐天校验库存。
3. 下单成功后逐天增加 `reserved_rooms`。
4. 订单金额按“日历价优先，缺失时用 `base_price`”计算。

2. `GET /bookings/:id`
- 说明：查询预订详情（含酒店与房型基础信息）。

3. `PATCH /bookings/:id/cancel`
- 说明：取消预订并回补库存。

### 10.9 联调时序（推荐）
1. 注册商户 + 注册管理员  
2. 商户登录 -> 建酒店 -> 建房型 -> 设价格 -> 提交 `PENDING`  
3. 管理员登录 -> 审核通过 -> 设库存  
4. 公开查询酒店列表/详情/可售房量  
5. 创建预订 -> 查详情 -> 取消预订  

## 11. Postman 使用说明
项目根目录已提供：`postman.json`

### 11.1 导入
1. 打开 Postman
2. `Import` -> 选择仓库根目录的 `postman.json`
3. 导入后会看到集合：`Easy-Stay Hotel Backend (Full APIs)`

### 11.2 建议执行顺序（从上到下）
1. `01 Health`
2. `02 Auth`（先注册再登录，会自动保存 `merchantToken/adminToken`）
3. `03 Merchant`（会自动保存 `hotelId/roomId/rejectHotelId`）
4. `04 Admin`（审核、库存设置）
5. `05 Public Hotels`
6. `06 Bookings`（会自动保存 `bookingId`）

### 11.3 变量说明（集合变量）
- `baseUrl`：默认 `http://localhost:3000`
- `merchantToken` / `adminToken`：登录后自动写入
- `hotelId` / `roomId` / `rejectHotelId` / `bookingId`：关键请求执行后自动写入
- `checkIn` / `checkOut`：可手动改为你要测试的日期

### 11.4 常见问题
1. 401 未授权：先执行对应登录请求，确保 token 已写入变量。  
2. 404 资源不存在：检查 `hotelId/roomId/bookingId` 是否为空或已失效。  
3. 400 库存不足：先用管理员接口调整库存后再下单。  
