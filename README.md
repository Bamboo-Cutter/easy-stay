# Easy-Stay Hotel

一个酒店预订演示系统仓库，包含后端 API、用户端（Taro）和商户/管理员后台（React/Vite）。

## 项目结构

- `apps/api`：后端服务（NestJS + Prisma + PostgreSQL）
- `user-mobile`：用户端（Taro React，当前主要用于联调）
- `admin-web`：商户/管理员后台（React + Vite）
- `docker-compose.yml`：本地 PostgreSQL 启动配置
- `er.png`：数据库 ER 图
- `apps/api/API.md`：后端接口文档（当前实现）

## 技术栈

- Node.js 20+
- pnpm
- NestJS 11
- Prisma 6
- PostgreSQL 16（Docker）
- React / Vite（后台）
- Taro React（用户端）

## 功能范围（当前实现）

- 认证与角色：`USER / MERCHANT / ADMIN`（JWT 鉴权）
- 商户侧：酒店创建/编辑、图片与标签维护、房型管理、价格日历维护、提审
- 管理员侧：酒店审核、状态管理、房型库存日历管理
- C 端查询：酒店列表/详情、日历、房型报价、筛选与推荐数据
- 预订链路：创建预订、查询详情、取消预订（释放库存）

## 本地运行（快速开始）

### 1. 环境准备

需要安装：

- Node.js `20+`
- `pnpm`
- Docker Desktop（并已启动）

### 2. 启动数据库（PostgreSQL）

在项目根目录执行：

```bash
docker compose up -d
```

默认数据库配置（来自 `docker-compose.yml`）：

- Host: `localhost`
- Port: `5432`
- DB: `hotel_booking`
- User: `hotel`
- Password: `hotel123`

### 3. 启动后端 `apps/api`

```bash
pnpm -C apps/api install
cp apps/api/.env.example apps/api/.env
```

说明：

- 实际运行需要 `apps/api/.env`
- `apps/api/.env.example` 已包含本地开发默认值（数据库/JWT）
- `apps/api/.env.test` 已存在，可用于 `test:e2e`

初始化数据库结构：

```bash
pnpm -C apps/api exec dotenv -e .env -- prisma db push
```

可选：灌入演示数据（默认会生成较大规模酒店数据）

```bash
pnpm -C apps/api exec dotenv -e .env -- prisma db seed
```

启动后端：

```bash
pnpm -C apps/api start:dev
```

服务地址：

- API：`http://localhost:3000`
- 健康检查：`GET http://localhost:3000/health`

### 4. 启动用户端 `user-mobile`

```bash
pnpm -C user-mobile install
pnpm -C user-mobile weapp
```

说明：

- 默认 H5 地址通常为 `http://localhost:10086`（以终端输出为准）
- 默认请求后端 `http://localhost:3000`（见 `user-mobile/src/utils/api.js`）

### 5. 启动后台 `admin-web`

```bash
pnpm -C admin-web install
pnpm -C admin-web dev
```

默认地址：

- `http://localhost:5173`

说明：

- 前端通过 Vite 代理将 `/api` 转发到 `http://localhost:3000`（见 `admin-web/vite.config.js`）

## 演示账号（执行 seed 后）

`apps/api/prisma/seed.ts` 会创建以下账号：

- 管理员：`admin@demo.com` / `Admin12345!`
- 商户：`merchant1@demo.com` / `Merchant12345!`
- 商户：`merchant2@demo.com` / `Merchant12345!`
- 商户：`merchant3@demo.com` / `Merchant12345!`
- 用户：`user@demo.com` / `User12345!`

## 常用命令

### 后端 `apps/api`

```bash
# 构建
pnpm -C apps/api build

# Lint（会 --fix）
pnpm -C apps/api lint

# 单测
pnpm -C apps/api test

# e2e 测试（使用 .env.test）
pnpm -C apps/api test:e2e

# 接口主链路自检（merchant/admin/user + booking）
pnpm -C apps/api self-check:all
```

### 前端

```bash
# admin-web
pnpm -C admin-web build
pnpm -C admin-web lint

# user-mobile（H5）
pnpm -C user-mobile build:h5
```

## API 与调试资料

- 后端接口文档：`apps/api/API.md`
- Postman 集合：`apps/easy-stay-api.postman_collection.json`
- 其他调试文件：`postman.json`

## 数据模型

核心表（简要）：

- `users`
- `hotels`
- `rooms`
- `price_calendar`
- `room_inventory_daily`
- `bookings`
- `hotel_images` / `hotel_tags` / `nearby_points` / `review_summary`

ER 图：`er.png`

## 常见问题

### 1. 前端启动了但请求失败

确认以下服务是否都在运行：

- PostgreSQL（Docker）
- `apps/api`（`3000`）
- `admin-web`（`5173`）或 `user-mobile`（H5）

### 2. Prisma 命令报数据库连接错误

检查 `apps/api/.env` 中 `DATABASE_URL` 是否与 `docker-compose.yml` 一致：

```env
DATABASE_URL="postgresql://hotel:hotel123@localhost:5432/hotel_booking?schema=public"
```

### 3. 数据量太大导致 seed 慢

`seed.ts` 支持环境变量调小数据规模，例如：

- `SEED_HOTEL_COUNT`
- `SEED_CALENDAR_DAYS`
- `SEED_BOOKING_COUNT`

示例：

```bash
SEED_HOTEL_COUNT=200 SEED_CALENDAR_DAYS=30 SEED_BOOKING_COUNT=20 pnpm -C apps/api exec dotenv -e .env -- prisma db seed
```
# Easy-Stay Hotel API 文档（当前实现）

本文件基于 `apps/api/src` 当前代码与本地联调结果整理，作为项目 API 的最新说明。

适用版本：
- `apps/api`（NestJS + Prisma）
- 当前数据库角色枚举已包含：`USER` / `MERCHANT` / `ADMIN`

## 1. 基本信息

- Base URL：`http://localhost:3000`
- Content-Type：`application/json`
- 鉴权方式：`Authorization: Bearer <access_token>`
- 时间格式：ISO8601（例如 `2026-02-23T00:00:00.000Z`）
- 日期输入：推荐 `YYYY-MM-DD`（服务端会转为当天 `00:00:00`）
- 价格单位：`int`（分），例如 `16800` = `¥168.00`

## 2. 统一约定

### 2.1 常见状态码

- `200`：成功
- `201`：创建成功
- `400`：参数错误 / 校验失败 / 业务前置条件不满足
- `401`：未登录或 Token 无效
- `403`：角色权限不足
- `404`：资源不存在

### 2.2 错误响应（Nest 默认风格）

```json
{
  "statusCode": 400,
  "message": "Bad Request",
  "error": "Bad Request"
}
```

`message` 在很多接口中可能是：
- 字符串（如：`"当前不支持前台注册管理员账号"`）
- 数组（如 DTO 校验失败时）

### 2.3 枚举

- `user_role`
  - `USER`（普通用户 / C 端账号）
  - `MERCHANT`（商户）
  - `ADMIN`（管理员）
- `hotel_status`
  - `DRAFT` / `PENDING` / `APPROVED` / `REJECTED` / `OFFLINE`
- `booking_status`
  - `PENDING` / `CONFIRMED` / `CANCELLED` / `COMPLETED`

## 3. 安全与权限说明

### 3.1 注册登录安全策略（当前实现）

- 密码强度（后端强校验）：
  - `8-64` 位
  - 必须包含：大写字母 / 小写字母 / 数字 / 特殊字符
  - 不允许空白字符
- 邮箱会在后端做标准化：
  - `trim + lowercase`
- 认证接口存在轻量限流（内存）：
  - `login/register` 过于频繁会被短时拒绝

### 3.2 角色与访问控制

- `USER`：用于 C 端登录与订单记录（当前不可访问商户/管理员接口）
- `MERCHANT`：访问 `/merchant/*`
- `ADMIN`：访问 `/admin/*`
- `/merchant/*` 当前允许 `MERCHANT` 和 `ADMIN` 访问（管理员可调试/查看）

### 3.3 前台注册限制

- 前台公开注册 **不允许** 创建 `ADMIN`
- `/auth/register` 默认角色为 `USER`（若未传 `role`）

## 4. 接口总览

### 4.1 公开接口

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /hotels`
- `GET /hotels/suggestions`
- `GET /hotels/featured`
- `GET /hotels/banners`
- `GET /hotels/filter-metadata`
- `GET /hotels/rooms/:roomId/prices`
- `GET /hotels/rooms/:roomId/availability`
- `GET /hotels/:id`
- `GET /hotels/:id/offers`
- `GET /hotels/:id/calendar`
- `GET /hotels/:id/reviews-summary`
- `POST /bookings`
- `GET /bookings/:id`
- `PATCH /bookings/:id/cancel`

### 4.2 需要登录（JWT）

- `GET /auth/me`
- `POST /auth/logout`

### 4.3 商户接口（`MERCHANT` / `ADMIN`）

- `GET /merchant/me`
- `GET /merchant/hotels`
- `GET /merchant/hotels/:id`
- `POST /merchant/hotels`
- `PATCH /merchant/hotels/:id`
- `PATCH /merchant/hotels/:id/status`
- `POST /merchant/hotels/:id/images`
- `POST /merchant/hotels/:id/tags`
- `POST /merchant/hotels/:id/rooms`
- `POST /merchant/rooms/:roomId/prices`

### 4.4 管理员接口（`ADMIN`）

- `GET /admin/hotels`
- `POST /admin/hotels`
- `PATCH /admin/hotels/:id`
- `GET /admin/hotels/pending`
- `GET /admin/hotels/:id`
- `GET /admin/merchants/:merchantId/hotels`
- `POST /admin/hotels/:id/approve`
- `POST /admin/hotels/:id/reject`
- `PATCH /admin/hotels/:id/reject`
- `PATCH /admin/hotels/:id/status`
- `GET /admin/rooms/:roomId/inventory`
- `POST /admin/rooms/:roomId/inventory`

## 5. Health

### `GET /health`

返回：

```json
{ "status": "ok" }
```

## 6. Auth（认证）

### 6.1 `POST /auth/register`

注册账号（默认注册 `USER`）。

请求体：

```json
{
  "email": "user1@example.com",
  "password": "User12345!",
  "role": "USER"
}
```

字段说明：
- `email`：邮箱（后端自动 `trim + lowercase`）
- `password`：强密码（见安全策略）
- `role`（可选）：`USER | MERCHANT | ADMIN`
  - 不传默认 `USER`
  - 传 `ADMIN` 会被拒绝（前台不支持）

成功返回（`201`）：

```json
{
  "id": "cmlyxxxx",
  "email": "user1@example.com",
  "role": "USER",
  "created_at": "2026-02-23T03:00:00.000Z"
}
```

常见失败：
- `400`：密码不符合规则 / 邮箱已存在 / 前台注册管理员

### 6.2 `POST /auth/login`

请求体：

```json
{
  "email": "user1@example.com",
  "password": "User12345!"
}
```

成功返回（`201`）：

```json
{
  "access_token": "jwt_token",
  "user": {
    "id": "cmlyxxxx",
    "email": "user1@example.com",
    "role": "USER"
  }
}
```

### 6.3 `GET /auth/me`（JWT）

请求头：

```http
Authorization: Bearer <access_token>
```

返回（JWT 载荷 + `id`）：

```json
{
  "sub": "cmlyxxxx",
  "email": "user1@example.com",
  "role": "USER",
  "iat": 1771789000,
  "exp": 1772393800,
  "id": "cmlyxxxx"
}
```

### 6.4 `POST /auth/logout`（JWT）

当前为无状态示例实现。

返回：

```json
{ "status": "ok" }
```

## 7. C 端公开酒店接口（Public Hotels）

### 7.1 `GET /hotels`

公开酒店列表，支持分页、筛选、排序、附近条件与人数筛选（基于房型 `max_occupancy`）。

#### Query 参数（全部可选）

- 基础查询
  - `city: string`
  - `keyword: string`（匹配城市/酒店名/地址/附近点位）
  - `page: number`（默认 `1`）
  - `limit: number`（默认 `20`）
- 入住信息
  - `check_in: ISO8601`
  - `check_out: ISO8601`
  - `rooms_count: number >= 1`
  - `adults: number >= 1`
  - `children: number >= 0`
- 价格筛选（分）
  - `min_price`
  - `max_price`
- 星级筛选
  - `min_star`（1-5）
  - `max_star`（1-5）
- 评分筛选
  - `min_rating`
- 房型特性筛选
  - `breakfast=true|false`
  - `refundable=true|false`
- 附近点位筛选
  - `nearby_type`：常用 `metro | attraction`
  - `nearby_keyword`：附近关键词（模糊匹配）
  - `nearby_sort`：`none | distance_asc | distance_desc`
- 排序
  - `sort`：`recommended | price_asc | price_desc | rating_desc | star_desc | newest | smart`

#### 示例

```http
GET /hotels?city=成都&check_in=2026-02-23&check_out=2026-02-24&rooms_count=1&adults=2&children=1&nearby_type=metro&nearby_sort=distance_asc&sort=price_asc
```

#### 返回（示例，已省略部分字段）

```json
{
  "items": [
    {
      "id": "cmlyxxxx",
      "name_cn": "悦栈成都青羊区中心旅居酒店-2141",
      "city": "成都",
      "star": 4,
      "type": "商务型",
      "hotel_images": [],
      "nearby_points": [],
      "review_summary": {
        "rating": 8.9,
        "review_count": 342
      },
      "min_nightly_price": 16800,
      "min_total_price": 16800,
      "available_room_types": 3,
      "guest_fit_room_types": 2,
      "nearby_match_count": 1,
      "nearest_nearby_point": {
        "type": "metro",
        "name": "春熙路地铁站",
        "distance_km": 0.6
      },
      "nearest_nearby_distance_km": 0.6
    }
  ],
  "total": 123,
  "page": 1,
  "limit": 20,
  "filters": {
    "min_price": null,
    "max_price": null,
    "min_star": null,
    "max_star": null,
    "min_rating": null,
    "breakfast": false,
    "refundable": false,
    "nearby_type": "metro",
    "nearby_keyword": null,
    "nearby_sort": "distance_asc",
    "adults": 2,
    "children": 1,
    "rooms_count": 1
  }
}
```

### 7.2 `GET /hotels/suggestions`

搜索建议（城市 / 酒店名）。

#### Query

- `keyword?: string`
- `city?: string`

> 注意：参数名是 `keyword`，不是 `q`。

#### 返回

```json
{
  "items": [
    {
      "id": "cmlyxxxx",
      "city": "成都",
      "label": "悦栈成都青羊区中心旅居酒店-2141 · 成都",
      "rating": 8.9
    }
  ],
  "total": 1
}
```

### 7.3 `GET /hotels/featured`

首页推荐酒店（卡片列表）。

返回字段（数组）：
- `id`
- `name_cn`
- `name_en`
- `city`
- `star`
- `cover`
- `rating`
- `review_count`
- `min_price`

### 7.4 `GET /hotels/banners`

首页 Banner 数据。

返回字段（数组）：
- `id`
- `title`
- `subtitle`
- `image`
- `cta`（当前固定文案）
- `min_price`

### 7.5 `GET /hotels/filter-metadata`

列表页筛选元信息（含当前城市可选附近点位）。

#### Query

- `city?: string`

#### 返回（示例）

```json
{
  "city": "成都",
  "price_range": {
    "min": 5200,
    "max": 598000
  },
  "star_counts": [
    { "star": 2, "count": 120 },
    { "star": 3, "count": 260 }
  ],
  "room_feature_counts": {
    "breakfast": 800,
    "refundable": 760
  },
  "rating_bands": {
    "6_plus": 900,
    "7_plus": 900,
    "8_plus": 800,
    "9_plus": 600
  },
  "popular_tags": [
    { "tag": "近地铁", "count": 120 }
  ],
  "nearby_points": {
    "metro": [
      { "type": "metro", "name": "春熙路地铁站", "count": 42 }
    ],
    "attraction": [
      { "type": "attraction", "name": "武侯祠", "count": 35 }
    ]
  }
}
```

### 7.6 `GET /hotels/rooms/:roomId/prices`

查询单房型价格日历。

#### Query

- `from?: ISO8601`
- `to?: ISO8601`

#### 返回

数组（`price_calendar[]`）：
- `id`
- `room_id`
- `date`
- `price`
- `promo_type`
- `promo_value`

### 7.7 `GET /hotels/rooms/:roomId/availability`

查询房型在入住区间内的最小可售房量。

#### Query

- `check_in?: ISO8601`
- `check_out?: ISO8601`
- `rooms_count?: number`（默认 `1`）

#### 返回（示例）

```json
{
  "room_id": "cmlyroomid",
  "required_rooms": 1,
  "available_rooms": 6,
  "is_available": true
}
```

> 如果未传 `check_in/check_out`，仅返回当前房型总可售房量概览：
> `{"room_id":"...","available_rooms":10}`

### 7.8 `GET /hotels/:id`

公开酒店详情（仅 `APPROVED` 酒店）。

#### Query

- `check_in?: ISO8601`
- `check_out?: ISO8601`
- `rooms_count?: number`

#### 返回

- 基础酒店详情（图片、标签、房型、附近点、评分摘要）
- 当传入住区间时，附加 `room_price_list`

`room_price_list` 示例：

```json
[
  {
    "room_id": "cmlyroomid",
    "room_name": "标准大床房",
    "base_price": 16800,
    "available_rooms": 6,
    "max_occupancy": 2
  }
]
```

### 7.9 `GET /hotels/:id/offers`

按入住/离店计算房型报价与可售情况。

#### Query

- `check_in?: ISO8601`
- `check_out?: ISO8601`
- `rooms_count?: number`

> 当前 `offers` 接口只使用 `StayRangeDto`，**不接收** `adults/children` 参数。

#### 返回（示例）

```json
{
  "hotel_id": "cmlyhotelid",
  "check_in": "2026-02-23",
  "check_out": "2026-02-24",
  "rooms_count": 1,
  "items": [
    {
      "room_id": "cmlyroomid",
      "room_name": "标准大床房",
      "base_price": 16800,
      "refundable": true,
      "breakfast": true,
      "max_occupancy": 2,
      "nightly_price": 16800,
      "total_price": 16800,
      "nights": 1,
      "available_rooms": 6,
      "is_available": true
    }
  ]
}
```

### 7.10 `GET /hotels/:id/calendar`

酒店月历价格（按天返回最低价与可售状态）。

#### Query

- `month?: YYYY-MM`

#### 返回（示例）

```json
{
  "hotel_id": "cmlyhotelid",
  "month": "2026-02",
  "days": [
    { "date": "2026-02-23", "min_price": 16800, "is_available": true }
  ]
}
```

### 7.11 `GET /hotels/:id/reviews-summary`

酒店评分摘要（由 `review_summary` 派生）。

返回（示例）：

```json
{
  "hotel_id": "cmlyhotelid",
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
  "ai_summary": "酒店位于成都区域，整体评价很好..."
}
```

## 8. Bookings（预订）

> 当前预订接口为公开接口（无 JWT 强制），`user_id` 可为空，支持游客下单。

### 8.1 `POST /bookings`

创建预订，同时校验库存并扣减入住区间库存。

请求体：

```json
{
  "user_id": "cmlyuserid_optional",
  "hotel_id": "cmlyhotelid",
  "room_id": "cmlyroomid",
  "check_in": "2026-02-23",
  "check_out": "2026-02-24",
  "rooms_count": 1,
  "guest_count": 1,
  "contact_name": "张三",
  "contact_phone": "13800138000"
}
```

说明：
- `user_id` 可选（游客订单可不传）
- `check_out` 必须晚于 `check_in`
- `total_amount` 由后端按价格日历计算

成功返回（`201`）：

```json
{
  "id": "cmlybookingid",
  "user_id": "cmlyuserid_optional",
  "hotel_id": "cmlyhotelid",
  "room_id": "cmlyroomid",
  "check_in": "2026-02-23T00:00:00.000Z",
  "check_out": "2026-02-24T00:00:00.000Z",
  "rooms_count": 1,
  "guest_count": 1,
  "total_amount": 16800,
  "status": "CONFIRMED",
  "contact_name": "张三",
  "contact_phone": "13800138000"
}
```

常见失败：
- `400`：库存不足 / 酒店不可预订 / 日期区间非法
- `404`：房型不存在或房型不属于该酒店

### 8.2 `GET /bookings/:id`

查询订单详情（含简化酒店/房型信息）。

返回包含：
- booking 主记录
- `hotel`：`id/name_cn/name_en/city/address`
- `room`：`id/name/max_occupancy`

### 8.3 `PATCH /bookings/:id/cancel`

取消订单，并释放已占用库存。

返回：更新后的 booking（`status=CANCELLED`）

## 9. Merchant（商户端）

> 需要 JWT，角色为 `MERCHANT` 或 `ADMIN`

### 9.1 `GET /merchant/me`

返回当前登录商户基础资料：
- `id`
- `email`
- `role`
- `created_at`

### 9.2 `GET /merchant/hotels`

返回当前商户名下酒店列表（数组），通常包含关联字段：
- `hotel_images`
- `hotel_tags`
- `nearby_points`
- `review_summary`
- `rooms`

### 9.3 `GET /merchant/hotels/:id`

返回当前商户名下单酒店详情（含房型、价格日历、库存日历等）

### 9.4 `POST /merchant/hotels`

创建酒店（支持一体化创建图片/标签/房型/附近点）

请求体（示例）：

```json
{
  "name_cn": "易宿测试酒店",
  "name_en": "Easy Stay Demo Hotel",
  "address": "上海浦东新区世纪大道100号",
  "city": "上海",
  "star": 4,
  "type": "商务型",
  "open_year": "2022-05-01T00:00:00.000Z",
  "status": "DRAFT",
  "images": [
    { "url": "https://example.com/a.jpg", "sort": 0 }
  ],
  "tags": ["近地铁", "商务"],
  "nearby_points": [
    { "type": "metro", "name": "陆家嘴地铁站", "distance_km": 0.5 }
  ],
  "rooms": [
    {
      "name": "标准大床房",
      "max_occupancy": 2,
      "total_rooms": 10,
      "base_price": 16800,
      "refundable": true,
      "breakfast": true
    }
  ]
}
```

说明：
- 若创建时包含 `rooms`，后端会自动生成默认价格/库存日历（未来周期）

### 9.5 `PATCH /merchant/hotels/:id`

更新酒店信息（支持部分字段更新）。

请求体：`UpsertHotelDto`

可更新字段：
- `name_cn/name_en/address/city/star/type/open_year/status`
- `images[]`
- `tags[]`
- `rooms[]`
- `nearby_points[]`

### 9.6 `PATCH /merchant/hotels/:id/status`

请求体：

```json
{ "status": "PENDING" }
```

说明：
- 商户状态流转一般用于：草稿 -> 提审 / 上线酒店下线等
- 实际允许范围由服务端控制

### 9.7 `POST /merchant/hotels/:id/images`

覆盖设置酒店图片。

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

### 9.8 `POST /merchant/hotels/:id/tags`

覆盖设置酒店标签。

请求体：

```json
{ "tags": ["近地铁", "含早餐"] }
```

返回：

```json
{ "status": "ok" }
```

### 9.9 `POST /merchant/hotels/:id/rooms`

新增房型。

请求体：

```json
{
  "name": "豪华双床房",
  "max_occupancy": 2,
  "total_rooms": 10,
  "base_price": 19900,
  "refundable": true,
  "breakfast": true
}
```

### 9.10 `POST /merchant/rooms/:roomId/prices`

房型价格日历按日 upsert。

请求体：

```json
{
  "date": "2026-03-01T00:00:00.000Z",
  "price": 21900,
  "promo_type": "DISCOUNT",
  "promo_value": 10
}
```

## 10. Admin（管理员端）

> 需要 JWT，角色必须为 `ADMIN`

### 10.1 `GET /admin/hotels`

查询全量酒店（跨商户）。

### 10.2 `POST /admin/hotels`

管理员创建酒店，能力与商户创建基本一致（入参复用 `CreateHotelFullDto`）。

### 10.3 `PATCH /admin/hotels/:id`

管理员更新酒店，入参复用 `UpsertHotelDto`。

### 10.4 `GET /admin/hotels/pending`

查询待审核酒店列表（`PENDING`）。

### 10.5 `GET /admin/hotels/:id`

查询单酒店详情（按酒店 id）。

### 10.6 `GET /admin/merchants/:merchantId/hotels`

查询指定商户名下酒店。

返回（示例）：

```json
{
  "merchant": {
    "id": "cmlymerchantid",
    "email": "merchant1@demo.com",
    "role": "MERCHANT"
  },
  "hotels": []
}
```

### 10.7 `POST /admin/hotels/:id/approve`

审核通过酒店，返回更新后的酒店记录（状态改为 `APPROVED`）。

### 10.8 `POST /admin/hotels/:id/reject`

请求体：

```json
{ "reason": "资料不完整" }
```

返回更新后的酒店记录（状态 `REJECTED`，写入 `reject_reason`）。

### 10.9 `PATCH /admin/hotels/:id/reject`

仅修改拒绝原因（常用于已拒绝酒店二次反馈）。

请求体：

```json
{ "reason": "请补充更清晰的营业执照图片" }
```

### 10.10 `PATCH /admin/hotels/:id/status`

管理员直接设置酒店状态。

请求体：

```json
{
  "status": "OFFLINE",
  "reason": "可选，仅某些状态下有意义"
}
```

### 10.11 `GET /admin/rooms/:roomId/inventory`

查询房型库存日历。

#### Query

- `from?: ISO8601`
- `to?: ISO8601`

返回（示例）：

```json
[
  {
    "id": "cmlyinv",
    "room_id": "cmlyroom",
    "date": "2026-03-01T00:00:00.000Z",
    "total_rooms": 20,
    "reserved_rooms": 3,
    "blocked_rooms": 1,
    "available_rooms": 16
  }
]
```

### 10.12 `POST /admin/rooms/:roomId/inventory`

设置某房型某天库存（总房量 / 锁房）。

请求体：

```json
{
  "date": "2026-03-01T00:00:00.000Z",
  "total_rooms": 20,
  "blocked_rooms": 2
}
```

## 11. 典型联调流程（推荐）

### 11.1 用户端（C 端）预订流程

1. `POST /auth/register`（注册 `USER`）
2. `POST /auth/login`
3. `GET /hotels`（携带日期/人数/筛选）
4. `GET /hotels/:id`（详情）
5. `GET /hotels/:id/offers`（房型报价）
6. `POST /bookings`（创建订单）
7. `GET /bookings/:id`（查详情）
8. `PATCH /bookings/:id/cancel`（取消订单，可选）

### 11.2 商户上架流程

1. `POST /auth/login`（商户）
2. `POST /merchant/hotels`（创建草稿）
3. `PATCH /merchant/hotels/:id`（补资料）
4. `PATCH /merchant/hotels/:id/status`（提审）
5. 管理员审核通过后转 `APPROVED`

### 11.3 管理员审核流程

1. `POST /auth/login`（管理员）
2. `GET /admin/hotels/pending`
3. `POST /admin/hotels/:id/approve` 或 `POST /admin/hotels/:id/reject`

## 12. 已知实现差异 / 注意事项（前后端联调常见坑）

1. `GET /hotels/suggestions` 的参数名是 `keyword`，不是 `q`
2. `GET /hotels/:id/offers` 返回字段是 `items`，不是 `offers`
3. `/hotels` 列表支持 `adults/children`（按 `rooms.max_occupancy` 过滤），但 `offers` 接口当前只接 `rooms_count`
4. 预订接口目前为公开接口，`user_id` 可为空（游客下单）
5. 前台公开注册不允许 `ADMIN`
6. 密码强度由后端强校验，前端也应同步同规则

## 13. 快速验证示例（curl）

### 13.1 健康检查

```bash
curl -sS http://localhost:3000/health
```

### 13.2 注册普通用户

```bash
curl -sS -X POST http://localhost:3000/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"user1@example.com","password":"User12345!","role":"USER"}'
```

### 13.3 查询酒店（成都 + 日期 + 人数）

```bash
curl -sS 'http://localhost:3000/hotels?city=成都&check_in=2026-02-23&check_out=2026-02-24&rooms_count=1&adults=2&children=0&limit=5'
```

### 13.4 查询当前城市附近点位元信息

```bash
curl -sS 'http://localhost:3000/hotels/filter-metadata?city=成都'
```

## 14. 一键自检（推荐）

项目内已提供完整自检脚本（覆盖三角色真实流程 + 前后端接口契约静态审计）：

```bash
pnpm -C apps/api self-check:all
```

覆盖范围（当前实现）：
1. `merchant`：登录 -> 创建酒店草稿 -> 图片/标签 -> 创建房型 -> 价格 -> 提审
2. `admin`：登录 -> 待审核列表 -> 审核通过 -> 房量设置/查询 -> 上下线
3. `user`：注册/登录 -> 搜索 -> 建议词 -> 元信息 -> 详情 -> 报价 -> 创建订单 -> 取消订单
4. 前后端接口契约静态审计：
   - `user-mobile/src/utils/api.js`
   - `admin-web/src/api/auth.js`
   - `admin-web/src/pages/**/*.jsx` 中 `axios` 路径

输出为 JSON；`"checks.pass": true` 表示本轮自检通过。



