
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

## 5.1 Base URL

本地开发：

```
http://localhost:3000
```

---

## 5.2 认证方式

使用 **JWT Bearer Token**

请求头：

```
Authorization: Bearer <token>
```

---

## 5.3 Health

### ✅ GET `/health`

**用途**：确认服务是否启动成功

* Method: `GET`
* Auth: 无
* Response (示例)：

```json
{ "ok": true }
```

---

## 5.4 Auth

### ✅ POST `/auth/register`

**用途**：注册账号

* Method: `POST`
* Auth: 无
* Body (JSON)（示例，按你的 DTO 字段来）：

```json
{
  "email": "test@example.com",
  "password": "123456"
}
```

* Response (示例)：

```json
{
  "id": "xxx",
  "email": "test@example.com",
  "role": "MERCHANT",
  "createdAt": "2026-02-02T..."
}
```


---

### ✅ POST `/auth/login`

**用途**：登录并获取 token

* Method: `POST`
* Auth: 无
* Body (JSON)：

```json
{
  "email": "test@example.com",
  "password": "123456"
}
```

* Response (示例)：

```json
{
  "accessToken": "xxxxx.yyyyy.zzzzz"
}
```

---

###  GET `/auth/me`






