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

## 8. 主要 API（当前代码实现）
- Health
  - `GET /health`
- Auth
  - `POST /auth/register`
  - `POST /auth/login`
  - `GET /auth/me`
  - `POST /auth/logout`
- Merchant（JWT + `MERCHANT` / `ADMIN`）
  - `GET /merchant/me`
  - `GET /merchant/hotels`
  - `GET /merchant/hotels/:id`
  - `POST /merchant/hotels`（一体化创建：可带 images/tags/rooms/nearby_points）
  - `PATCH /merchant/hotels/:id`
  - `POST /merchant/hotels/:id/images`
  - `POST /merchant/hotels/:id/tags`
  - `POST /merchant/hotels/:id/rooms`
  - `POST /merchant/rooms/:roomId/prices`
- Admin（JWT + `ADMIN`）
  - `GET /admin/hotels`
  - `GET /admin/hotels/pending`
  - `GET /admin/hotels/:id`
  - `GET /admin/merchants/:merchantId/hotels`
  - `POST /admin/hotels/:id/approve`
  - `POST /admin/hotels/:id/reject`
  - `PATCH /admin/hotels/:id/status`
  - `GET /admin/rooms/:roomId/inventory`
  - `POST /admin/rooms/:roomId/inventory`
- Hotels (Public)
  - `GET /hotels`（列表，支持分页/排序/筛选）
  - `GET /hotels/suggestions`
  - `GET /hotels/featured`
  - `GET /hotels/banners`
  - `GET /hotels/filter-metadata`
  - `GET /hotels/:id`
  - `GET /hotels/:id/offers`
  - `GET /hotels/:id/calendar`
  - `GET /hotels/:id/reviews-summary`
  - `GET /hotels/rooms/:roomId/prices`
  - `GET /hotels/rooms/:roomId/availability`
- Bookings（当前实现为公开）
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

## 10. API Reference
Base URL: `http://localhost:3000`

### 10.1 Authentication
- Header: `Authorization: Bearer <access_token>`
- Auth required: endpoint 标注为 `Yes` 时必须携带 Header。

### 10.2 Standard Error Response
```json
{
  "statusCode": 400,
  "message": "error message",
  "error": "Bad Request"
}
```

### 10.3 Status Codes
- `200 OK`: 查询/更新成功
- `201 Created`: 创建成功
- `400 Bad Request`: 参数校验失败或业务校验失败
- `401 Unauthorized`: 未登录或 Token 无效
- `403 Forbidden`: 角色或资源权限不足
- `404 Not Found`: 资源不存在

### 10.4 Endpoints

#### Health

##### 1) Health Check
- Method: `GET`
- Path: `/health`
- Auth: `No`

Success `200`
```json
{ "status": "ok" }
```

---

#### Auth

##### 2) Register
- Method: `POST`
- Path: `/auth/register`
- Auth: `No`

Request Body
| Field | Type | Required | Constraints |
|---|---|---|---|
| email | string | Yes | email |
| password | string | Yes | min length 6 |
| role | enum | No | `MERCHANT` / `ADMIN` |

Example
```json
{
  "email": "merchant_demo@test.com",
  "password": "123456",
  "role": "MERCHANT"
}
```

Success `201`
```json
{
  "id": "user_id",
  "email": "merchant_demo@test.com",
  "role": "MERCHANT",
  "created_at": "2026-02-08T12:00:00.000Z"
}
```

##### 3) Login
- Method: `POST`
- Path: `/auth/login`
- Auth: `No`

Request Body
| Field | Type | Required |
|---|---|---|
| email | string | Yes |
| password | string | Yes |

Success `201`
```json
{
  "access_token": "jwt_token",
  "user": {
    "id": "user_id",
    "email": "merchant_demo@test.com",
    "role": "MERCHANT"
  }
}
```

##### 4) Get Current User
- Method: `GET`
- Path: `/auth/me`
- Auth: `Yes`

Success `200`
```json
{
  "id": "user_id",
  "sub": "user_id",
  "email": "merchant_demo@test.com",
  "role": "MERCHANT"
}
```

##### 5) Logout
- Method: `POST`
- Path: `/auth/logout`
- Auth: `Yes`

Success `201`
```json
{ "status": "ok" }
```

---

#### Merchant

##### 6) Merchant Profile
- Method: `GET`
- Path: `/merchant/me`
- Auth: `Yes` (`MERCHANT` / `ADMIN`)

##### 7) Merchant Hotels
- Method: `GET`
- Path: `/merchant/hotels`
- Auth: `Yes` (`MERCHANT` / `ADMIN`)

##### 8) Create Hotel
- Method: `POST`
- Path: `/merchant/hotels`
- Auth: `Yes` (`MERCHANT` / `ADMIN`)

Request Body
| Field | Type | Required |
|---|---|---|
| name_cn | string | Yes |
| name_en | string | No |
| address | string | Yes |
| city | string | Yes |
| star | int | Yes |
| type | string | Yes |
| open_year | int | Yes |
| status | enum | No |

##### 9) Update Hotel
- Method: `PATCH`
- Path: `/merchant/hotels/{id}`
- Auth: `Yes` (`MERCHANT` / `ADMIN`)

Path Params
| Name | Type | Required |
|---|---|---|
| id | string | Yes |

##### 10) Set Hotel Images
- Method: `POST`
- Path: `/merchant/hotels/{id}/images`
- Auth: `Yes` (`MERCHANT` / `ADMIN`)

Request Body
| Field | Type | Required |
|---|---|---|
| items | array | Yes |
| items[].url | string | Yes |
| items[].sort | int | Yes |

##### 11) Set Hotel Tags
- Method: `POST`
- Path: `/merchant/hotels/{id}/tags`
- Auth: `Yes` (`MERCHANT` / `ADMIN`)

Request Body
| Field | Type | Required |
|---|---|---|
| tags | string[] | Yes |

##### 12) Create Room
- Method: `POST`
- Path: `/merchant/hotels/{id}/rooms`
- Auth: `Yes` (`MERCHANT` / `ADMIN`)

Request Body
| Field | Type | Required |
|---|---|---|
| name | string | Yes |
| max_occupancy | int | Yes |
| total_rooms | int | Yes |
| base_price | int | Yes |
| refundable | boolean | Yes |
| breakfast | boolean | Yes |

##### 13) Upsert Room Price Calendar
- Method: `POST`
- Path: `/merchant/rooms/{roomId}/prices`
- Auth: `Yes` (`MERCHANT` / `ADMIN`)

Path Params
| Name | Type | Required |
|---|---|---|
| roomId | string | Yes |

Request Body
| Field | Type | Required |
|---|---|---|
| date | ISO8601 string | Yes |
| price | int | Yes |
| promo_type | string | No |
| promo_value | int | No |

---

#### Admin

##### 14) Pending Hotels
- Method: `GET`
- Path: `/admin/hotels/pending`
- Auth: `Yes` (`ADMIN`)

##### 15) Approve Hotel
- Method: `POST`
- Path: `/admin/hotels/{id}/approve`
- Auth: `Yes` (`ADMIN`)

Path Params
| Name | Type | Required |
|---|---|---|
| id | string | Yes |

##### 16) Reject Hotel
- Method: `POST`
- Path: `/admin/hotels/{id}/reject`
- Auth: `Yes` (`ADMIN`)

Request Body
| Field | Type | Required |
|---|---|---|
| reason | string | No |

##### 17) Get Room Inventory Calendar
- Method: `GET`
- Path: `/admin/rooms/{roomId}/inventory`
- Auth: `Yes` (`ADMIN`)

Path Params
| Name | Type | Required |
|---|---|---|
| roomId | string | Yes |

Query Params
| Name | Type | Required |
|---|---|---|
| from | ISO8601 string | No |
| to | ISO8601 string | No |

##### 18) Set Room Inventory
- Method: `POST`
- Path: `/admin/rooms/{roomId}/inventory`
- Auth: `Yes` (`ADMIN`)

Request Body
| Field | Type | Required |
|---|---|---|
| date | ISO8601 string | Yes |
| total_rooms | int | No |
| blocked_rooms | int | No |

---

#### Public Hotels

##### 19) List Hotels
- Method: `GET`
- Path: `/hotels`
- Auth: `No`

Query Params
| Name | Type | Required | Default |
|---|---|---|---|
| city | string | No | - |
| keyword | string | No | - |
| page | int | No | 1 |
| limit | int | No | 20 |

Success `200`
```json
{
  "items": [],
  "total": 120,
  "page": 1,
  "limit": 20
}
```

##### 20) Hotel Detail
- Method: `GET`
- Path: `/hotels/{id}`
- Auth: `No`

Path Params
| Name | Type | Required |
|---|---|---|
| id | string | Yes |

Query Params
| Name | Type | Required | Notes |
|---|---|---|---|
| check_in | ISO8601 string | No | 与 `check_out` 同时使用 |
| check_out | ISO8601 string | No | 离店日 |
| rooms_count | int | No | 默认 1 |

##### 21) Room Price Calendar
- Method: `GET`
- Path: `/hotels/rooms/{roomId}/prices`
- Auth: `No`

Query Params: `from`, `to`（可选）

##### 22) Room Availability
- Method: `GET`
- Path: `/hotels/rooms/{roomId}/availability`
- Auth: `No`

Query Params
| Name | Type | Required |
|---|---|---|
| check_in | ISO8601 string | No |
| check_out | ISO8601 string | No |
| rooms_count | int | No |

Success `200`
```json
{
  "room_id": "room_id",
  "required_rooms": 1,
  "available_rooms": 6,
  "is_available": true
}
```

---

#### Bookings

##### 23) Create Booking
- Method: `POST`
- Path: `/bookings`
- Auth: `No` (当前实现)

Request Body
| Field | Type | Required |
|---|---|---|
| hotel_id | string | Yes |
| room_id | string | Yes |
| check_in | ISO8601 string | Yes |
| check_out | ISO8601 string | Yes |
| rooms_count | int | Yes |
| guest_count | int | Yes |
| contact_name | string | Yes |
| contact_phone | string | Yes |
| user_id | string | No |

Success `201`
```json
{
  "id": "booking_id",
  "status": "CONFIRMED",
  "total_amount": 52000
}
```

##### 24) Booking Detail
- Method: `GET`
- Path: `/bookings/{id}`
- Auth: `No` (当前实现)

##### 25) Cancel Booking
- Method: `PATCH`
- Path: `/bookings/{id}/cancel`
- Auth: `No` (当前实现)

Success `200`
```json
{ "id": "booking_id", "status": "CANCELLED" }
```

### 10.5 Business Rules
1. 酒店必须为 `APPROVED` 才可预订。
2. 预订会按 `room_id + date` 校验并扣减库存（`reserved_rooms`）。
3. 取消预订会回补库存。
4. 价格计算优先使用 `price_calendar`，缺失时回退 `rooms.base_price`。
5. `check_out` 不计入库存占用夜晚。

### 10.6 Integration Flow
1. Register merchant/admin -> login
2. Merchant create hotel -> create room -> set price -> submit `PENDING`
3. Admin approve hotel -> set room inventory
4. Public query hotels/detail/availability
5. Create booking -> get booking detail -> cancel booking

### 10.7 权限与状态规则（当前实现）
1. `/admin/**` 全部要求 `ADMIN` JWT。
2. `/merchant/**` 要求 `MERCHANT` 或 `ADMIN` JWT，但商户只能操作“自己的酒店/房型”。
3. 管理端酒店查询不返回 `DRAFT`（`GET /admin/hotels`、`GET /admin/hotels/:id`、`GET /admin/merchants/:merchantId/hotels`）。
4. 管理员可设置酒店状态：`PENDING` / `APPROVED` / `REJECTED` / `OFFLINE`，不允许设为 `DRAFT`。
5. 商户可设置酒店状态：`DRAFT` / `PENDING` / `OFFLINE`（不允许直接设 `APPROVED` / `REJECTED`）。
6. 公开酒店接口只返回 `APPROVED` 酒店。


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
