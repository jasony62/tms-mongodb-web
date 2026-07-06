## Context

当前系统所有数据存储强绑定 MongoDB Driver（`mongodb@5.6.0`），通过 `tms-koa` 注入的 `MongoContext` 提供 `mongoClient`。Model 层直接使用 MongoDB 原生查询操作符（`$regex`, `$set`, `$elemMatch` 等），无 ORM 抽象层。

目标是在不改动核心 Model 层的前提下，引入 PostgreSQL 作为可选存储后端。

## Goals / Non-Goals

**Goals:**
- 通过 `TMW_STORAGE_BACKEND=mongodb|ferretdb` 环境变量切换存储后端
- MongoDB 模式下零改动，完全兼容当前行为
- FerretDB 模式下：
  - 文档 CRUD 通过 FerretDB 翻译层写入 PostgreSQL（零改动 MongoDB 驱动调用）
  - 关系型模块（ACL、Tag、操作日志）直接通过 `PgPool` 走 SQL
  - MongoDB 特有管理功能（profiling、admin command）返回"不支持"
- 新增代码最小化（~1 个文件，改动 ~5 个文件）

**Non-Goals:**
- 不引入 ORM 抽象层
- 不改变前端 API 接口
- FerretDB 模式下不追求 100% MongoDB 功能覆盖（profiling/admin 放弃）
- 不改变数据模型 schema

## Decisions

### 1. FerretDB 作为文档存储翻译层

FerretDB 实现 MongoDB Wire Protocol 前端，PostgreSQL 作为后端存储。应用层的 MongoDB 驱动调用无需改动——只是连接目标从 MongoDB 切换为 FerretDB。

**选择理由**：这是唯一能在不改动 Model 层核心 CRUD 代码的前提下，将文档数据存入 PostgreSQL 的路径。替代方案 DAO 抽象层需要改写 ~40+ 个文件。

**限制**：FerretDB 不支持 profiling、admin command、`initializeUnorderedBulkOp` 等 MongoDB 特有功能。这些功能在 ferretdb 模式下被跳过或用替代实现。

### 2. 关系型模块直接走 SQL

ACL、Tag、操作日志这些模块的数据模型是纯关系型（user-target-permission、键值标签、append-only 日志），直接通过 `PgPool` 查询 PostgreSQL，不经 FerretDB。

**选择理由**：
- `$elemMatch` 在 FerretDB 中支持程度不确定，而 ACL 是核心功能，不能有兼容性风险
- 直接 SQL 可以充分利用 PG 的关系查询能力（JOIN、UNIQUE 约束、窗口函数）
- 这些模块数据量小、查询模式固定，直接 SQL 实现简单

### 3. 运行时切换而非编译时

通过环境变量 `TMW_STORAGE_BACKEND` 在启动时决定后端，非运行时动态切换。

**选择理由**：简化实现，避免双数据源同步问题。部署时确定后端，启动后不再切换。

## 架构

```
                     TMW_STORAGE_BACKEND
                     ┌──────────┴──────────┐
                     ↓                     ↓
                 mongodb                ferretdb
                     │                     │
            ┌────────┴────────┐   ┌────────┴──────────────┐
            │  MongoDB        │   │  FerretDB              │
            │  (原生)          │   │  (Wire Protocol → PG)  │
            │                 │   │                         │
            │  model/*.ts     │   │  model/*.ts  (零改动)   │
            │  全功能          │   │  (除 acl/tag/db 外)     │
            │                 │   │                         │
            │  acl/tag/日志   │   │  acl/tag/日志            │
            │  → MongoDB      │   │  → PgPool → SQL → PG   │
            │                 │   │                         │
            │  profiling/admin│   │  profiling/admin         │
            │  → MongoDB      │   │  → 返回 "不支持"        │
            └─────────────────┘   └─────────────────────────┘
```

## 文件改动清单

| 文件 | 改动 |
|------|------|
| **新增:** `tmw-kit/src/pg/pool.ts` | PgPool 类，封装 `pg` 连接池 + `static available()` |
| `tmw-kit/src/model/acl.ts` | 加 `if (ferretdb)` 分支，走 PgPool.query() |
| `tmw-kit/src/model/tag.ts` | 同上 |
| `tmw-kit/src/model/db.ts` | profiling/admin command 加 `if (ferretdb)` 返回"不支持" |
| `tmw-kit/src/model/document.ts` | dataActionLog 加 `if (ferretdb)` 分支写 PG |
| `tmw-back/src/controllers/admin/db.ts` | profiling 加 `if (ferretdb)` 返回"不支持" |
| `packages/tmw-kit/package.json` | 新增 `pg` 依赖 |

## Docker 部署

项目采用 **多文件 Compose 叠加**模式。`docker-compose.ferretdb.yml` 的设计意图是作为 override 文件，和主 compose 文件叠加使用——同名 `mongodb` 服务会被覆盖为 FerretDB。

**MongoDB 模式**（现有，零改动）：

```bash
docker compose -f docker-compose.yml up               # 生产
docker compose -f docker-compose.dev.yml up           # 开发
```

**FerretDB 模式**（需更新 `docker-compose.ferretdb.yml`）：

```bash
docker compose -f docker-compose.yml -f docker-compose.ferretdb.yml up        # 生产
docker compose -f docker-compose.dev.yml -f docker-compose.ferretdb.yml up    # 开发
```

更新 `docker-compose.ferretdb.yml`，补充 `tmw-aio` 的环境变量注入：

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      - POSTGRES_USER=root
      - POSTGRES_PASSWORD=root
      - POSTGRES_DB=ferretdb
    volumes:
      - pg-data:/var/lib/postgresql/data
    networks:
      - net

  mongodb:
    image: ghcr.io/ferretdb/ferretdb
    restart: on-failure
    environment:
      - FERRETDB_POSTGRESQL_URL=postgres://postgres:5432/ferretdb
    networks:
      - net

  # override: 给 tmw-aio（docker-compose.yml）注入 ferretdb 模式环境变量
  tmw-aio:
    environment:
      - TMW_STORAGE_BACKEND=ferretdb
      - TMW_POSTGRES_URI=postgresql://root:root@postgres:5432/ferretdb
```

`Dockerfile` 和 `start_all.sh` 无需改动——`pg` 依赖只是 npm 包，`TMW_STORAGE_BACKEND` 和 `TMW_POSTGRES_URI` 由环境变量注入。

## 环境变量

```bash
# 存储后端选择
TMW_STORAGE_BACKEND=mongodb|ferretdb    # 默认 mongodb

# FerretDB 模式下 MongoDB URI 指向 FerretDB
TMW_MONGODB_URI=mongodb://ferretdb:27018/tmw_app

# FerretDB 模式下 PG 直连接口
TMW_POSTGRES_URI=postgresql://user:pass@localhost:5432/tmw_app
TMW_POSTGRES_MAX_POOL=10
```

## Risks / Trade-offs

| 风险 | 级别 | 缓解措施 |
|------|------|----------|
| FerretDB 版本升级 API 变化 | 中 | 锁定 FerretDB 版本号，通过 CI 测试验证 |
| FerretDB 文档 CRUD 性能 | 中 | 文档操作经 FerretDB 翻译层有额外开销，小规模够用 |
| ACL 直接 SQL 与 MongoDB 模式数据不同步 | 低 | 部署时选定后端，数据不跨后端共享 |
| profiling/admin 功能在 ferretdb 模式缺失 | 低 | 前端在 ferretdb 模式下隐藏对应 UI 入口 |
| `pg` 驱动包与现有 mongodb 驱动版本兼容 | 低 | 独立依赖，无冲突 |
