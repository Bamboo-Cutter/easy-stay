


# Easy-Stay Hotel 后端（Backend Only）

本仓库仅包含 **后端服务**（NestJS + Prisma + PostgreSQL）。  

---

## 技术栈

- **Node.js + TypeScript**
- **NestJS**（后端框架）
- **Prisma ORM**（数据库映射与迁移）
- **PostgreSQL**（使用 Docker Compose 本地启动）
- **pnpm**（包管理器）

---

## 目录结构

```

.
├── docker-compose.yml          # 本地 PostgreSQL（Docker）
└── apps
└── api                     # NestJS 后端服务
├── prisma
│   ├── schema.prisma   # 数据库 Schema（Prisma）
│   └── migrations      # 迁移历史（必须提交）
└── src                 # NestJS 源码

````

说明：
- `apps/api/prisma/`：Prisma 的 schema 与 migrations（数据库结构定义与迁移历史）
- `apps/api/src/prisma/`：NestJS 的 PrismaModule/PrismaService（依赖注入用）

---

## 环境要求

- 已安装 **Node.js**
- 已安装 **pnpm**
- 已安装并打开 **Docker Desktop**

---

## 快速启动（本地开发）

### 1）启动数据库（PostgreSQL）
在仓库根目录执行：

```bash
docker compose up -d
````

检查容器状态（可选）：

```bash
docker ps
```

### 2）安装后端依赖

进入后端目录：

```bash
cd apps/api
pnpm install
```

> 如果 pnpm 提示 build scripts 被忽略（例如 prisma/bcrypt），请执行：
>
> ```bash
> pnpm approve-builds
> pnpm prisma generate
> ```

### 3）配置环境变量

在 `apps/api` 下创建 `.env`（参考 `.env.example`）：

```env
DATABASE_URL="postgresql://hotel:hotel123@localhost:5432/hotel_booking?schema=public"
JWT_SECRET="replace_me"
```

说明：

* `.env` 不应提交到 GitHub
* `.env.example` 可提交作为示例

### 4）应用数据库迁移（建表）

在 `apps/api` 目录执行：

```bash
pnpm prisma migrate dev
pnpm prisma generate
```

### 5）启动后端服务（开发模式）

```bash
pnpm start:dev
```

---

## 接口验证

* 健康检查（如已实现）：
  `http://localhost:3000/health`

---

## Prisma Studio（可视化查看数据库）

在 `apps/api` 目录执行：

```bash
pnpm prisma studio
```

按终端提示打开浏览器地址即可查看表结构与数据。


---

## Git 分支说明

* 本仓库采用分支开发方式
* 后端初始化与主要开发在分支（例如 `backend-init`）上进行


# API

### 0. 基本信息

Base URL：http://localhost:3000

数据库：Docker Postgres（你容器名 easy_stay_db，5432 映射）

校验：全局 ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })

多传字段会 400（这是预期行为）

返回格式：JSON

### 1. 健康检查 Health
#### 1.1 GET /health

说明：用于确认服务存活

请求

无参数

响应示例（可能）

{ "ok": true }


常见状态码

200 OK：服务正常

404 Not Found：路由没挂上/模块没导入

### 2. 认证 Auth


#### 2.1 POST /auth/register

说明：注册用户（默认注册普通用户/或按你业务决定 role）

Headers

Content-Type: application/json

Body

{
  "email": "test1@demo.com",
  "password": "12345678"
}


校验规则（建议）

email：必填，合法邮箱

password：必填，建议 MinLength(6/8)

成功响应（示例）

常见两种做法：

返回用户信息（不含密码）

{ "id": "xxx", "email": "test1@demo.com", "role": "MERCHANT", "created_at": "..." }


直接返回 token（注册即登录）

{ "access_token": "..." }


失败响应

400 Bad Request：字段不合法 / 多余字段（forbidNonWhitelisted）

409 Conflict 或 400：邮箱已存在

#### 2.2 POST /auth/login

说明：邮箱密码登录，返回 JWT

Headers

Content-Type: application/json

Body

{
  "email": "test1@demo.com",
  "password": "12345678"
}


成功响应（建议统一）

{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}


失败响应

401 Unauthorized：邮箱不存在 / 密码错误（建议不要区分具体原因）

#### 2.3 GET /auth/me

说明：验证 token 是否生效，返回当前用户信息

Headers

Authorization: Bearer <token>

成功响应（示例）

{
  "id": "xxx",
  "email": "test1@demo.com",
  "role": "MERCHANT"
}


失败响应

401 Unauthorized：没带 token / token 无效 / 过期

### 3. 环境变量

建议 .env 至少有：

DATABASE_URL=postgresql://...

JWT_SECRET=dev_secret_change_me

JWT_EXPIRES_IN=1d（或 3600，但要和你 JwtModule 的类型一致）
