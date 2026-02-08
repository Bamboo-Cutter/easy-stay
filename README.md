
# Easy-Stay Hotel Backend (NestJS + Prisma + PostgreSQL)

这是 Easy-Stay Hotel 项目
后端采用 **NestJS + Prisma + PostgreSQL(Docker)**，并提供基础的 **Health Check**、**注册/登录** API。

---

## 1. 技术栈

* **Node.js**：建议 `v22.x`（不要用 v25，会遇到 ESM/CJS 依赖问题）
* **NestJS**：后端框架
* **Prisma**：ORM + Migration + Seed
* **PostgreSQL 16**：Docker 运行
* **pnpm**：包管理器

---

## 2. 项目结构

```bash
easy-stay-hotel/
  apps/
    api/                         # NestJS 后端
      prisma/
        schema.prisma
        migrations/
        seed.ts
      src/
        auth/
        health/
        prisma/
        main.ts
        app.module.ts
      .env.example
      package.json
    easy-stay-api.postman_collection.json  # Postman collection
  docker-compose.yml
  er.png
  README.md
```

---

## 3. 本地启动（推荐流程）

### 3.1 前置要求

* Node.js >= 22
* pnpm >= 10
* Docker Desktop

检查版本：

```bash
node -v
pnpm -v
docker -v
```

---

### 3.2 安装依赖

进入后端目录安装：

```bash
cd apps/api
pnpm install
```

---

### 3.3 启动数据库（Docker）

在项目根目录（有 `docker-compose.yml` 的地方）执行：

```bash
cd ../../
docker compose up -d
docker ps
```

确认 `postgres` 容器正常运行且端口 `5432` 映射出来。

---

### 3.4 配置环境变量

复制配置：

```bash
cd apps/api
cp .env.example .env
```

`.env` 内容：
```
DATABASE_URL="postgresql://hotel:hotel123@localhost:5432/hotel_booking?schema=public"
JWT_SECRET="dev_secret_change_me"
JWT_EXPIRES_IN="7d"
```


---

### 3.5 Prisma Migration + 生成 Client

在 `apps/api` 下执行：

```bash
pnpm prisma generate
pnpm prisma migrate dev
```

---

### 3.6 数据初始化（Seed）

```bash
pnpm prisma db seed
```

> Seed 脚本位置：`apps/api/prisma/seed.ts`

---

### 3.7 启动服务

```bash
pnpm start:dev
```

默认端口：`http://localhost:3000`

---

## 4. 健康检查

浏览器/命令行测试：

```bash
curl http://localhost:3000/health
```

成功时会返回类似：

```json
{ "ok": true }
```

---

# 5. API 文档（当前实现）



你上面那套代码逻辑整体是没问题的 ✅（Auth/JWT + RolesGuard + Merchant 校验归属 + Admin 审核 + Public 只展示 APPROVED 都很合理）。
唯一我会提醒你两点小坑（不影响写文档）：

1. **Public hotels 的 controller 路由顺序**：你写了 `@Get(':id')` 又写了 `@Get('rooms/:roomId/prices')`，Nest 一般能匹配更具体的，但为了稳，建议把 `rooms/:roomId/prices` 放在 `:id` 之前。
2. **logout** 是无状态 OK 返回，没问题，只是“真正登出”要靠前端删 token（或你后面做 token blacklist）。

下面给你一份 **API 文档（可直接粘进 README.md 的 API Documentation 部分）**，按你当前版本的接口来写。

---

## Easy-Stay Hotel Backend API Doc (v1)

**Base URL**: `http://localhost:3000`
**Content-Type**: `application/json`
**Auth**: 需要登录的接口加 Header：
`Authorization: Bearer <accessToken>`

**Role enum**

* `MERCHANT`
* `ADMIN`

**Hotel status enum**

* `DRAFT`
* `PENDING`
* `APPROVED`
* `REJECTED`
* `OFFLINE`

---

# 1) Health

### GET `/health`

用于检查服务是否在线

**Response 200**

```json
{ "status": "ok" }
```

---

# 2) Auth

## POST `/auth/register`

注册用户（支持可选 role；不传默认 MERCHANT）

**Body**

```json
{
  "email": "merchant1@test.com",
  "password": "123456",
  "role": "MERCHANT"
}
```

* `role` 可选，不传默认 `MERCHANT`

**Response 200**

```json
{
  "id": "ckw...cuid",
  "email": "merchant1@test.com",
  "role": "MERCHANT",
  "created_at": "2026-02-08T07:00:00.000Z"
}
```

---

## POST `/auth/login`

登录，返回 JWT token（字段名：`accessToken`）

**Body**

```json
{
  "email": "merchant1@test.com",
  "password": "123456"
}
```

**Response 200**

```json
{ "accessToken": "eyJhbGciOi..." }
```

---

## GET `/auth/me` (Bearer)

获取当前登录用户信息（来自 JwtStrategy validate 注入到 `req.user`）

**Response 200**

```json
{
  "id": "userId",
  "email": "merchant1@test.com",
  "role": "MERCHANT"
}
```

---

## POST `/auth/logout` (Bearer)

JWT 无状态登出，后端返回 ok，前端删除 token 即可

**Response 200**

```json
{ "status": "ok" }
```

---

# 3) Public Hotels (仅展示 APPROVED)

> 只有被 Admin 审核通过（`APPROVED`）的酒店，才会出现在 public 接口里。

## GET `/hotels`

酒店列表（支持 city/keyword/page/limit）

**Query Params**

* `city` (optional) string
* `keyword` (optional) string
* `page` (optional) int, default `1`
* `limit` (optional) int, default `20`

**Example**
`GET /hotels?city=Sydney&keyword=harbour&page=1&limit=20`

**Response 200**

```json
{
  "items": [
    {
      "id": "hotelId",
      "name_cn": "测试酒店",
      "name_en": "Test Hotel",
      "address": "1 Test St",
      "city": "Sydney",
      "star": 5,
      "type": "Resort",
      "open_year": 2020,
      "status": "APPROVED",
      "reject_reason": null,
      "merchant_id": "merchantUserId",
      "created_at": "2026-02-08T07:00:00.000Z",
      "updated_at": "2026-02-08T07:10:00.000Z",
      "hotel_images": [
        { "id": "imgId", "hotel_id": "hotelId", "url": "https://...", "sort": 0 }
      ],
      "hotel_tags": [
        { "id": "tagId", "hotel_id": "hotelId", "tag": "海景" }
      ],
      "review_summary": { "id": "rsId", "hotel_id": "hotelId", "rating": 0, "review_count": 0 }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

## GET `/hotels/:id`

酒店详情（包含 images/tags/rooms/nearby/review_summary）

**Response 200**

```json
{
  "id": "hotelId",
  "name_cn": "测试酒店",
  "name_en": "Test Hotel",
  "address": "1 Test St",
  "city": "Sydney",
  "star": 5,
  "type": "Resort",
  "open_year": 2020,
  "status": "APPROVED",
  "reject_reason": null,
  "merchant_id": "merchantUserId",
  "hotel_images": [],
  "hotel_tags": [],
  "rooms": [],
  "nearby_points": [],
  "review_summary": { "id": "rsId", "hotel_id": "hotelId", "rating": 0, "review_count": 0 },
  "created_at": "2026-02-08T07:00:00.000Z",
  "updated_at": "2026-02-08T07:10:00.000Z"
}
```

---

## GET `/hotels/rooms/:roomId/prices`

查看某个房型的价格日历（price_calendar）

**Query Params**

* `from` (optional) ISO8601
* `to` (optional) ISO8601

**Example**
`GET /hotels/rooms/roomId/prices?from=2026-02-01T00:00:00.000Z&to=2026-02-10T00:00:00.000Z`

**Response 200**

```json
[
  {
    "id": "pcId",
    "room_id": "roomId",
    "date": "2026-02-02T00:00:00.000Z",
    "price": 520,
    "promo_type": "DISCOUNT",
    "promo_value": 10
  }
]
```

---

# 4) Merchant (Bearer, role: MERCHANT / ADMIN)

## GET `/merchant/me`

商户个人信息（当前登录用户）

**Response 200**

```json
{
  "id": "userId",
  "email": "merchant1@test.com",
  "role": "MERCHANT",
  "created_at": "2026-02-08T07:00:00.000Z"
}
```

---

## GET `/merchant/hotels`

当前商户名下所有酒店（包含 images/tags/rooms/review_summary）

**Response 200**

```json
[
  {
    "id": "hotelId",
    "name_cn": "测试酒店",
    "status": "DRAFT",
    "hotel_images": [],
    "hotel_tags": [],
    "rooms": [],
    "review_summary": null
  }
]
```

---

## POST `/merchant/hotels`

创建酒店

**Body**

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

**Response 200**

```json
{
  "id": "hotelId",
  "merchant_id": "userId",
  "status": "DRAFT",
  "created_at": "2026-02-08T07:00:00.000Z",
  "updated_at": "2026-02-08T07:00:00.000Z"
}
```

---

## PATCH `/merchant/hotels/:id`

更新酒店（会校验 hotel 是否属于当前商户）

**Body**

```json
{
  "name_cn": "测试酒店(更新)",
  "name_en": "Test Hotel Updated",
  "address": "1 Test St",
  "city": "Sydney",
  "star": 5,
  "type": "Resort",
  "open_year": 2020,
  "status": "PENDING"
}
```

**Response 200**

```json
{
  "id": "hotelId",
  "status": "PENDING",
  "reject_reason": null,
  "updated_at": "2026-02-08T07:10:00.000Z"
}
```

---

## POST `/merchant/hotels/:id/images`

替换该酒店的所有图片（先 deleteMany 再 createMany）

**Body**

```json
{
  "items": [
    { "url": "https://example.com/1.jpg", "sort": 0 },
    { "url": "https://example.com/2.jpg", "sort": 1 }
  ]
}
```

**Response 200**

```json
{ "status": "ok" }
```

---

## POST `/merchant/hotels/:id/tags`

替换该酒店的所有标签（先 deleteMany 再 createMany）

**Body**

```json
{
  "tags": ["海景", "近地铁", "早餐"]
}
```

**Response 200**

```json
{ "status": "ok" }
```

---

## POST `/merchant/hotels/:id/rooms`

创建房型（room）

**Body**

```json
{
  "name": "Deluxe King",
  "capacity": 2,
  "base_price": 500,
  "refundable": true,
  "breakfast": false
}
```

**Response 200**

```json
{
  "id": "roomId",
  "hotel_id": "hotelId",
  "name": "Deluxe King",
  "capacity": 2,
  "base_price": 500,
  "refundable": true,
  "breakfast": false
}
```

---

## POST `/merchant/rooms/:roomId/prices`

写入/更新价格日历（按 `room_id + date` upsert）

**Body**

```json
{
  "date": "2026-02-02T00:00:00.000Z",
  "price": 520,
  "promo_type": "DISCOUNT",
  "promo_value": 10
}
```

**Response 200**

```json
{
  "id": "pcId",
  "room_id": "roomId",
  "date": "2026-02-02T00:00:00.000Z",
  "price": 520,
  "promo_type": "DISCOUNT",
  "promo_value": 10
}
```

---

# 5) Admin (Bearer, role: ADMIN)

## GET `/admin/hotels/pending`

查看待审核酒店列表（status=PENDING）

**Response 200**

```json
[
  {
    "id": "hotelId",
    "status": "PENDING",
    "merchant": { "id": "userId", "email": "merchant1@test.com", "role": "MERCHANT" }
  }
]
```

---

## POST `/admin/hotels/:id/approve`

审核通过（status=APPROVED，并清空 reject_reason）

**Response 200**

```json
{
  "id": "hotelId",
  "status": "APPROVED",
  "reject_reason": null
}
```

---

## POST `/admin/hotels/:id/reject`

审核拒绝（status=REJECTED，并写 reject_reason）

**Body**

```json
{ "reason": "资料不全" }
```

**Response 200**

```json
{
  "id": "hotelId",
  "status": "REJECTED",
  "reject_reason": "资料不全"
}
```




