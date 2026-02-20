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
- 创建/更新酒店时，后端会为房型自动生成默认 90 天 `price_calendar` 与 `inventory_daily`

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
    datetime open_year
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

## 8. API 文档（完整）

### 8.1 通用约定
- Base URL：`http://localhost:3000`
- 鉴权：`Authorization: Bearer <access_token>`
- Content-Type：`application/json`
- 时间字段：ISO8601（例如 `2026-02-20T00:00:00.000Z`）
- 日期输入：建议用 `YYYY-MM-DD` 或完整 ISO8601
- 价格单位：`int`，单位为“分”（例如 `15900` = 159.00）
- `open_year`：已升级为日期时间字段（`datetime`），请求体需传日期字符串

### 8.2 统一错误响应（Nest 默认）
```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "Bad Request"
}
```

### 8.3 状态枚举
- `user_role`：`MERCHANT` | `ADMIN`
- `hotel_status`：`DRAFT` | `PENDING` | `APPROVED` | `REJECTED` | `OFFLINE`
- `booking_status`：`PENDING` | `CONFIRMED` | `CANCELLED` | `COMPLETED`

### 8.4 Health（公开）

#### `GET /health`
返回：
```json
{ "status": "ok" }
```

### 8.5 Auth（公开 + JWT）

#### `POST /auth/register`
请求体：
```json
{
  "email": "merchant4@demo.com",
  "password": "Merchant12345!",
  "role": "MERCHANT"
}
```
返回：
```json
{
  "id": "cuid_xxx",
  "email": "merchant4@demo.com",
  "role": "MERCHANT",
  "created_at": "2026-02-20T10:00:00.000Z"
}
```

#### `POST /auth/login`
请求体：
```json
{
  "email": "merchant1@demo.com",
  "password": "Merchant12345!"
}
```
返回：
```json
{
  "access_token": "jwt_token",
  "user": {
    "id": "cuid_xxx",
    "email": "merchant1@demo.com",
    "role": "MERCHANT"
  }
}
```

#### `GET /auth/me`（JWT）
返回：
```json
{
  "sub": "cuid_xxx",
  "email": "merchant1@demo.com",
  "role": "MERCHANT",
  "iat": 1700000000,
  "exp": 1700600000,
  "id": "cuid_xxx"
}
```

#### `POST /auth/logout`（JWT）
返回：
```json
{ "status": "ok" }
```

### 8.6 Merchant（JWT + `MERCHANT`/`ADMIN`）

#### `GET /merchant/me`
返回：当前登录商户基础资料（`id/email/role/created_at`）。

#### `GET /merchant/hotels`
返回：当前商户酒店数组，包含 `hotel_images`、`hotel_tags`、`rooms`、`review_summary`。

#### `GET /merchant/hotels/:id`
返回：单酒店详情（含图片、标签、周边点、评分、房型、价格日历、库存日历）。

#### `POST /merchant/hotels`
请求体（最小必填）：
```json
{
  "name_cn": "易宿测试酒店",
  "address": "100 Demo Street",
  "city": "Sydney",
  "star": 5,
  "type": "Resort",
  "open_year": "2020-01-15"
}
```
可选字段：
- `name_en?: string`
- `status?: DRAFT|PENDING|OFFLINE`
- `images?: { url, sort? }[]`
- `tags?: string[]`
- `rooms?: { name, max_occupancy, total_rooms, base_price, refundable, breakfast }[]`
- `nearby_points?: { type, name, distance_km? }[]`

返回：新建酒店完整对象（含关联子表）；若传 `rooms`，会自动生成未来 90 天价格和库存日历。

#### `PATCH /merchant/hotels/:id`
请求体：`UpsertHotelDto`，可单字段更新。
示例：
```json
{
  "name_cn": "易宿测试酒店（新版）",
  "open_year": "2021-08-01",
  "status": "PENDING"
}
```
返回：更新后酒店详情（含图片/标签/周边点/评分/房型及日历）。

#### `PATCH /merchant/hotels/:id/status`
请求体：
```json
{ "status": "OFFLINE" }
```
说明：商户只允许设置 `DRAFT/PENDING/OFFLINE`。  
返回：更新后的酒店主记录。

#### `POST /merchant/hotels/:id/images`
请求体：
```json
{
  "items": [
    { "url": "https://example.com/1.jpg", "sort": 0 },
    { "url": "https://example.com/2.jpg", "sort": 1 }
  ]
}
```
返回：
```json
{ "status": "ok" }
```

#### `POST /merchant/hotels/:id/tags`
请求体：
```json
{ "tags": ["海景", "亲子"] }
```
返回：
```json
{ "status": "ok" }
```

#### `POST /merchant/hotels/:id/rooms`
请求体：
```json
{
  "name": "豪华双床房",
  "max_occupancy": 2,
  "total_rooms": 10,
  "base_price": 16900,
  "refundable": true,
  "breakfast": true
}
```
返回：新建房型对象。

#### `POST /merchant/rooms/:roomId/prices`
请求体：
```json
{
  "date": "2026-03-01",
  "price": 19900,
  "promo_type": "DISCOUNT",
  "promo_value": 10
}
```
返回：`price_calendar` upsert 后记录。

### 8.7 Admin（JWT + `ADMIN`）

#### `GET /admin/hotels`
返回：全量酒店（不含 `DRAFT`），带 `merchant` 和酒店详情关联。

#### `POST /admin/hotels`
与商户创建字段一致，返回新建酒店详情（默认状态 `PENDING`，除非显式传入允许状态）。

#### `PATCH /admin/hotels/:id`
与商户更新字段一致，返回更新后酒店详情。

#### `GET /admin/hotels/pending`
返回：待审核酒店列表（`status=PENDING`）。

#### `GET /admin/hotels/:id`
返回：单酒店详情（不含 `DRAFT`）。

#### `GET /admin/merchants/:merchantId/hotels`
返回：
```json
{
  "merchant": { "id": "cuid_xxx", "email": "merchant1@demo.com", "role": "MERCHANT" },
  "hotels": [ ... ]
}
```

#### `POST /admin/hotels/:id/approve`
返回：更新后的酒店（状态改为 `APPROVED`，并补齐未来库存日历）。

#### `POST /admin/hotels/:id/reject`
请求体：
```json
{ "reason": "资料不完整" }
```
返回：更新后的酒店（状态 `REJECTED`，写入 `reject_reason`）。

#### `PATCH /admin/hotels/:id/reject`
请求体：
```json
{ "reason": "营业执照需补充清晰版本" }
```
说明：仅 `REJECTED` 酒店可修改拒绝原因。  
返回：更新后的酒店记录。

#### `PATCH /admin/hotels/:id/status`
请求体：
```json
{
  "status": "OFFLINE",
  "reason": "可选，仅 status=REJECTED 时有意义"
}
```
说明：不允许改成 `DRAFT`。  
返回：更新后的酒店记录。

#### `GET /admin/rooms/:roomId/inventory`
Query：
- `from?: ISO8601`
- `to?: ISO8601`

返回：库存日历数组；每条包含 `available_rooms`：
```json
[
  {
    "id": "cuid_xxx",
    "room_id": "cuid_room",
    "date": "2026-03-01T00:00:00.000Z",
    "total_rooms": 20,
    "reserved_rooms": 3,
    "blocked_rooms": 1,
    "available_rooms": 16
  }
]
```

#### `POST /admin/rooms/:roomId/inventory`
请求体：
```json
{
  "date": "2026-03-01",
  "total_rooms": 20,
  "blocked_rooms": 2
}
```
返回：upsert 后库存记录。

### 8.8 Hotels Public（公开查询）

#### `GET /hotels`
Query（全部可选）：
- `city`、`keyword`
- `page`（默认 1）、`limit`（默认 20）
- `check_in`、`check_out`、`rooms_count`
- `min_price`、`max_price`
- `min_star`、`max_star`
- `min_rating`
- `breakfast`、`refundable`（布尔）
- `sort`：`recommended|price_asc|price_desc|rating_desc|star_desc|newest`

返回：
```json
{
  "items": [ ... ],
  "total": 120,
  "page": 1,
  "limit": 20,
  "filters": {
    "min_price": 10000,
    "max_price": 30000,
    "min_star": 3,
    "max_star": 5,
    "min_rating": 8,
    "breakfast": true,
    "refundable": false
  }
}
```
`items` 中会附加：
- `min_nightly_price`
- `min_total_price`
- `available_room_types`

#### `GET /hotels/suggestions`
Query：`keyword?`、`city?`  
返回：
```json
{
  "items": [
    { "id": "cuid_xxx", "city": "Sydney", "label": "易宿演示酒店-001 · Sydney", "rating": 8.9 }
  ],
  "total": 1
}
```

#### `GET /hotels/featured`
返回：首页推荐酒店数组（含 `cover`、`min_price`、`rating`）。

#### `GET /hotels/banners`
返回：Banner 数组（`title/subtitle/image/cta/min_price`）。

#### `GET /hotels/filter-metadata`
Query：`city?`  
返回：
```json
{
  "city": "Sydney",
  "price_range": { "min": 9800, "max": 42800 },
  "star_counts": [{ "star": 5, "count": 20 }],
  "room_feature_counts": { "breakfast": 300, "refundable": 280 },
  "rating_bands": { "6_plus": 90, "7_plus": 70, "8_plus": 50, "9_plus": 20 },
  "popular_tags": [{ "tag": "海景", "count": 35 }]
}
```

#### `GET /hotels/rooms/:roomId/prices`
Query：`from?`、`to?`（ISO8601）  
返回：`price_calendar[]`。

#### `GET /hotels/rooms/:roomId/availability`
Query：`check_in?`、`check_out?`、`rooms_count?`  
返回：
```json
{
  "room_id": "cuid_room",
  "required_rooms": 2,
  "available_rooms": 5,
  "is_available": true
}
```

#### `GET /hotels/:id`
Query：`check_in?`、`check_out?`、`rooms_count?`  
返回：酒店详情；当传入住离店时，附加 `room_price_list`。

#### `GET /hotels/:id/offers`
Query：`check_in?`、`check_out?`、`rooms_count?`  
返回：
```json
{
  "hotel_id": "cuid_hotel",
  "check_in": "2026-03-01",
  "check_out": "2026-03-03",
  "rooms_count": 1,
  "items": [
    {
      "room_id": "cuid_room",
      "room_name": "豪华双床房",
      "base_price": 16900,
      "refundable": true,
      "breakfast": true,
      "max_occupancy": 2,
      "nightly_price": 17800,
      "total_price": 35600,
      "nights": 2,
      "available_rooms": 6,
      "is_available": true
    }
  ]
}
```

#### `GET /hotels/:id/calendar`
Query：`month?`（`YYYY-MM`）  
返回：
```json
{
  "hotel_id": "cuid_hotel",
  "month": "2026-03",
  "days": [
    { "date": "2026-03-01", "min_price": 16800, "is_available": true }
  ]
}
```

#### `GET /hotels/:id/reviews-summary`
返回：
```json
{
  "hotel_id": "cuid_hotel",
  "rating": 8.7,
  "review_count": 320,
  "grade": "很好",
  "dimensions": {
    "cleanliness": 8.9,
    "service": 8.4,
    "facilities": 8.6,
    "location": 9.1
  },
  "distribution": {
    "9_plus": 80,
    "8_plus": 96,
    "7_plus": 96,
    "6_plus": 48
  },
  "ai_summary": "..."
}
```

### 8.9 Bookings（当前实现为公开）

#### `POST /bookings`
请求体：
```json
{
  "user_id": "cuid_user_optional",
  "hotel_id": "cuid_hotel",
  "room_id": "cuid_room",
  "check_in": "2026-03-01",
  "check_out": "2026-03-03",
  "rooms_count": 1,
  "guest_count": 2,
  "contact_name": "张三",
  "contact_phone": "13800138000"
}
```
返回：创建后的 booking 记录（`status=CONFIRMED`，`total_amount` 为后端计算值）。

#### `GET /bookings/:id`
返回：预订详情，附带 `hotel`（简化字段）和 `room`（简化字段）。

#### `PATCH /bookings/:id/cancel`
返回：取消后的 booking 记录（`status=CANCELLED`），并自动回补库存。

## 9. 上传 Git 前检查清单
建议按顺序执行：

```bash
pnpm -C apps/api lint
pnpm -C apps/api build
pnpm -C apps/api test:e2e
```

三项都通过后再提交。

## 10. Postman 使用说明
项目根目录已提供：`postman.json`

### 10.1 导入
1. 打开 Postman
2. `Import` -> 选择仓库根目录的 `postman.json`
3. 导入后会看到集合：`Easy-Stay Hotel Backend (Full APIs)`

### 10.2 建议执行顺序（从上到下）
1. `01 Health`
2. `02 Auth`（先注册再登录，会自动保存 `merchantToken/adminToken`）
3. `03 Merchant`（会自动保存 `hotelId/roomId/rejectHotelId`）
4. `04 Admin`（审核、库存设置）
5. `05 Public Hotels`
6. `06 Bookings`（会自动保存 `bookingId`）

### 10.3 变量说明（集合变量）
- `baseUrl`：默认 `http://localhost:3000`
- `merchantToken` / `adminToken`：登录后自动写入
- `hotelId` / `roomId` / `rejectHotelId` / `bookingId`：关键请求执行后自动写入
- `checkIn` / `checkOut`：可手动改为你要测试的日期

### 10.4 常见问题
1. 401 未授权：先执行对应登录请求，确保 token 已写入变量。  
2. 404 资源不存在：检查 `hotelId/roomId/bookingId` 是否为空或已失效。  
3. 400 库存不足：先用管理员接口调整库存后再下单。  
