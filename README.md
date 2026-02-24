# Easy-Stay Hotel

本仓库包含一套完整的酒店预订演示系统（后端 + 用户端 + 商户/管理员后台）：
- `apps/api`：后端 API（NestJS + Prisma + PostgreSQL）
- `user-mobile`：用户端（Taro React，当前主要跑 H5）
- `admin-web`：商户/管理员 PC 后台（React + Vite）

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
- `user-mobile/src`：用户端页面与交互逻辑（搜索、详情、报价、预订、个人中心）
- `admin-web/src`：商户/管理员后台页面（登录、酒店管理、审核等）
- `docker-compose.yml`：本地 PostgreSQL 启动配置

## 3. 环境准备
要求：
- Node.js 20+
- pnpm
- Docker Desktop

## 4. 本地启动步骤


### 1) 准备环境
先确保本机有：
- Node.js（建议 20+）
- pnpm
- Docker Desktop（并已启动）

### 2) 拉代码
```bash
git clone <你的仓库地址>
cd easy-stay-hotel
```

### 3) 启动数据库（PostgreSQL）
在项目根目录执行：
```bash
docker compose up -d
```

检查是否起来：
```bash
docker ps
```
应该能看到 `easy_stay_db`（或 compose 里定义的 db 服务）。

### 4) 安装后端依赖
```bash
pnpm -C apps/api install
```

### 5) 配置环境变量
在 `apps/api` 下准备 `.env` 和 `.env.test`（可参考 `.env.example`）  
核心至少要有：
```env
DATABASE_URL="postgresql://hotel:hotel123@localhost:5432/hotel_booking?schema=public"
JWT_SECRET="dev_secret_change_me"
JWT_EXPIRES_IN="7d"
```

### 6) 同步数据库表结构
```bash
pnpm -C apps/api exec dotenv -e .env.test -- prisma db push
```

### 7) （可选）灌入演示数据
当前 seed 默认会生成较大规模演示数据（约 `5000` 酒店，可通过环境变量调整）：
```bash
pnpm -C apps/api exec dotenv -e .env.test -- prisma db seed
```

### 8) 启动后端
```bash
pnpm -C apps/api start:dev
```
默认接口地址：
- `http://localhost:3000`
- 健康检查：`GET /health`

### 9) 启动用户端（H5）
```bash
pnpm -C user-mobile install
pnpm -C user-mobile dev:h5
```
默认地址（以终端输出为准）：
- `http://localhost:10086`

### 10) 启动商户/管理员后台（PC）
```bash
pnpm -C admin-web install
pnpm -C admin-web dev
```
默认地址：
- `http://localhost:5173`

说明：
- `admin-web` 登录后根据账号角色进入不同逻辑（`MERCHANT` / `ADMIN`）
- `user-mobile`、`admin-web`、`apps/api` 建议三端同时运行进行联调


## 5. 常用命令
```bash
# 构建
pnpm -C apps/api build

# 代码检查
pnpm -C apps/api lint

# e2e 测试
pnpm -C apps/api test:e2e

# 三角色接口自检（merchant/admin/user + booking 主链路 + 前端接口契约审计）
pnpm -C apps/api self-check:all
```

## 6. 当前后端功能范围
### 6.1 认证与角色
- 用户 / 商户 / 管理员注册登录（`USER` / `MERCHANT` / `ADMIN`）
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

最新且完整的 API 文档请优先查看：

- `apps/api/API.md`

说明：
- `apps/api/API.md` 已按当前实现更新（包含 `USER` 角色、附近筛选、人数筛选、Booking 主流程、安全说明）
- 若本 README 下方内容与代码不一致，请以 `apps/api/API.md` 为准

### 8.1 通用约定
- Base URL：`http://localhost:3000`
- 鉴权：`Authorization: Bearer <access_token>`
- Content-Type：`application/json`
- 时间字段：ISO8601（例如 `2026-02-20T00:00:00.000Z`）
- 日期输入：建议用 `YYYY-MM-DD` 或完整 ISO8601
- 价格单位（API）：`int`，单位为“分”（例如 `15900` = 159.00）
- 前端页面展示：通常转换为“元”（如 `¥159`）
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
- `user_role`：`USER` | `MERCHANT` | `ADMIN`
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

## 9. 三端联调（推荐流程）

建议同时启动：
- 后端：`apps/api`（3000）
- 用户端：`user-mobile` H5（10086）
- 后台：`admin-web`（5173）

一轮联调流程（最容易发现协同问题）：
1. 商户端创建酒店草稿、房型、价格并提交审核
2. 管理员端在待审核列表中审核通过
3. 用户端搜索该酒店，进入详情页 / 房型页 / 预订 / 取消订单
4. 回到后台验证状态、库存、上下线变更是否影响用户端可见性

常见联调问题：
- 前端写死 `localhost`（真机或云端会失效）
- 后端未启动导致列表页“加载失败”
- 日期参数编码未解码（已在当前代码修复）
- 过去日期仍可预订（后端已强校验拦截）

## 10. 云端互通部署建议（user-app / merchant / admin 共用后端）

推荐目标拓扑：
- `user-mobile`（H5 或 App）
- `admin-web`（商户/管理员后台）
- `apps/api`（云服务器）
- PostgreSQL（云数据库）
- （建议）对象存储用于酒店图片

关键原则：
1. 三端共用同一套云端 API（统一域名，如 `https://api.example.com`）
2. 前端不要使用 `localhost` 作为 API 地址
3. 后端生产环境必须配置 HTTPS 与正确的 CORS 白名单

最低上线步骤：
1. 部署 `apps/api` 到云服务器
2. 配置云数据库并执行 `prisma migrate deploy`
3. 部署 `admin-web` 到静态站点/Nginx
4. 将 `user-mobile` API 基地址切换到云端域名
5. 验证商户创建 -> 管理员审核 -> 用户预订的完整链路

## 11. 用户端打包为 App（安卓 / iOS）说明

当前 `user-mobile` 为 Taro 项目，日常开发主要使用 `H5`。

可行路径（推荐先落地 H5 容器化方案）：
- 方案 A（推荐）：`Taro H5 + Capacitor` 打包 Android / iOS 安装包
- 方案 B：`Taro RN`（改造成本更高）

注意：
- 真机/App 中 `localhost` 无法访问你电脑上的后端
- App 联网测试需改为云端域名或局域网 IP（开发阶段）
- iOS 建议使用 HTTPS（避免 ATS 限制）

## 12. 上传 Git 前检查清单
建议按顺序执行：

```bash
pnpm -C apps/api lint
pnpm -C apps/api build
pnpm -C apps/api test:e2e
```

三项都通过后再提交。

## 13. Postman 使用说明
项目根目录已提供：`postman.json`

### 13.1 导入
1. 打开 Postman
2. `Import` -> 选择仓库根目录的 `postman.json`
3. 导入后会看到集合：`Easy-Stay Hotel Backend (Full APIs)`

### 13.2 建议执行顺序（从上到下）
1. `01 Health`
2. `02 Auth`（先注册再登录，会自动保存 `merchantToken/adminToken`）
3. `03 Merchant`（会自动保存 `hotelId/roomId/rejectHotelId`）
4. `04 Admin`（审核、库存设置）
5. `05 Public Hotels`
6. `06 Bookings`（会自动保存 `bookingId`）

### 13.3 变量说明（集合变量）
- `baseUrl`：默认 `http://localhost:3000`
- `merchantToken` / `adminToken`：登录后自动写入
- `hotelId` / `roomId` / `rejectHotelId` / `bookingId`：关键请求执行后自动写入
- `checkIn` / `checkOut`：可手动改为你要测试的日期

### 13.4 常见问题
1. 401 未授权：先执行对应登录请求，确保 token 已写入变量。  
2. 404 资源不存在：检查 `hotelId/roomId/bookingId` 是否为空或已失效。  
3. 400 库存不足：先用管理员接口调整库存后再下单。  
