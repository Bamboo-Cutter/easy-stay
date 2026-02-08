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

## 10. API 文档（联调版）
Base URL：`http://localhost:3000`

鉴权方式：
- 需要登录的接口请带请求头 `Authorization: Bearer <access_token>`

### 10.1 Health
1. `GET /health`
请求参数：无  
响应示例：
```json
{ "status": "ok" }
```

### 10.2 Auth
1. `POST /auth/register`
请求体：
```json
{
  "email": "merchant_demo@test.com",
  "password": "123456",
  "role": "MERCHANT"
}
```

2. `POST /auth/login`
请求体：
```json
{
  "email": "merchant_demo@test.com",
  "password": "123456"
}
```
响应示例：
```json
{
  "access_token": "xxx",
  "user": { "id": "u1", "email": "merchant_demo@test.com", "role": "MERCHANT" }
}
```

3. `GET /auth/me`（需鉴权）  
4. `POST /auth/logout`（需鉴权）

### 10.3 Merchant（需鉴权，商户/管理员）
1. `GET /merchant/me`
2. `GET /merchant/hotels`
3. `POST /merchant/hotels`
请求体示例：
```json
{
  "name_cn": "测试酒店",
  "name_en": "Test Hotel",
  "address": "1 Test St",
  "city": "Sydney",
  "star": 5,
  "type": "Resort",
  "open_year": 2020,
  "status": "DRAFT"
}
```

4. `PATCH /merchant/hotels/:id`
5. `POST /merchant/hotels/:id/images`
```json
{ "items": [{ "url": "https://example.com/1.jpg", "sort": 0 }] }
```
6. `POST /merchant/hotels/:id/tags`
```json
{ "tags": ["海景", "近地铁"] }
```
7. `POST /merchant/hotels/:id/rooms`
```json
{
  "name": "Deluxe King",
  "max_occupancy": 2,
  "total_rooms": 8,
  "base_price": 500,
  "refundable": true,
  "breakfast": false
}
```
8. `POST /merchant/rooms/:roomId/prices`
```json
{
  "date": "2026-02-10T00:00:00.000Z",
  "price": 520,
  "promo_type": "DISCOUNT",
  "promo_value": 10
}
```

### 10.4 Admin（需鉴权，管理员）
1. `GET /admin/hotels/pending`
2. `POST /admin/hotels/:id/approve`
3. `POST /admin/hotels/:id/reject`
```json
{ "reason": "资料不完整" }
```
4. `GET /admin/rooms/:roomId/inventory?from=...&to=...`
5. `POST /admin/rooms/:roomId/inventory`
```json
{
  "date": "2026-02-10T00:00:00.000Z",
  "total_rooms": 8,
  "blocked_rooms": 2
}
```

### 10.5 Hotels（公开）
1. `GET /hotels?city=Sydney&keyword=测试&page=1&limit=20`
2. `GET /hotels/:id`  
支持可选参数：`check_in`、`check_out`、`rooms_count`
3. `GET /hotels/rooms/:roomId/prices?from=...&to=...`
4. `GET /hotels/rooms/:roomId/availability?check_in=...&check_out=...&rooms_count=1`

### 10.6 Bookings（公开下单流程）
1. `POST /bookings`
```json
{
  "hotel_id": "h1",
  "room_id": "r1",
  "check_in": "2026-02-10T00:00:00.000Z",
  "check_out": "2026-02-12T00:00:00.000Z",
  "rooms_count": 1,
  "guest_count": 2,
  "contact_name": "Alice",
  "contact_phone": "18800001111",
  "user_id": "u1"
}
```
响应关键字段：`id`、`status`、`total_amount`

2. `GET /bookings/:id`

3. `PATCH /bookings/:id/cancel`
响应关键字段：`status: "CANCELLED"`

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
