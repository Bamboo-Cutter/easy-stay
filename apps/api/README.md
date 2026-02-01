# Easy-Stay Hotel Backend

This repo contains **backend only** (NestJS + Prisma + PostgreSQL via Docker).
Frontend is handled in a separate repo / by another teammate.

## Tech Stack
- NestJS (TypeScript)
- Prisma ORM
- PostgreSQL (Docker Compose)
- pnpm

## Prerequisites
- Node.js (installed)
- pnpm
- Docker Desktop

## Project Structure
- `docker-compose.yml` - local PostgreSQL
- `apps/api` - NestJS API service
  - `prisma/schema.prisma` - database schema
  - `prisma/migrations` - migration history

## Quick Start

### 1) Start database
From repo root:
```bash
docker compose up -d

### 2) Setup API
cd apps/api
pnpm install

### 3) Apply migrations
pnpm prisma migrate dev
pnpm prisma generate

### 4) Run API (dev)
pnpm start:dev

Health Check

After API starts, open:

http://localhost:3000/

(If you have a health controller, use /health accordingly.)

Prisma Studio
cd apps/api
pnpm prisma studio


Then open the printed localhost URL.


你可以把最后那段 Health Check 改成你真实能访问的 endpoint（如果你最终健康检查是 `/health` 就写 `/health`）。

---

## 7）提交到新分支并 push
先检查哪些文件要提交：

```bash
git status


添加所有变更：

git add .


提交：

git commit -m "chore: bootstrap backend (NestJS + Prisma + Postgres)"


推送到远端新分支：

git push -u origin backend-init


-u：把本地分支和远端分支绑定，以后你只要 git push 就行

8）（可选）在 GitHub 上开 Pull Request

你 push 完以后，GitHub 页面一般会提示你创建 PR：
backend-init -> main

如果你们团队需要走 PR 流程就开；不需要也可以先放分支里。
