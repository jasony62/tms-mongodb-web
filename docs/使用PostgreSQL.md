# 使用 PostgreSQL 作为存储后端

tms-mongodb-web 支持通过 [FerretDB](https://github.com/FerretDB/FerretDB) 将存储后端从原生 MongoDB 切换到 PostgreSQL。切换后，业务数据（文档的增删改查）仍然通过 MongoDB 协议由 FerretDB 翻译并落到 PostgreSQL；而元数据（数据库、集合、ACL、标签、目录、桶等）在 `ferretdb` 模式下直接走 PostgreSQL 原生 SQL，避免通过 FerretDB 翻译层。

## 1. 实现原理

### 1.1 整体架构

```
┌────────────────────── tmw-back ──────────────────────┐
│                                                      │
│   控制器 (controllers)                               │
│        │                                             │
│        ▼                                             │
│   model 层 (tmw-kit/src/model/*)                    │
│        │                                             │
│        ├── 判断 isFerretdb() / isMongodb()          │
│        │                                             │
│        ├─▶ Mongo 存储库 ───▶ 原生 MongoDB (27017)  │
│        │                                               │
│        └─▶ Pg    存储库 ─┬─▶ PostgreSQL 直接 SQL   │  ← 元数据/ACL/标签/...
│                          │                            │
│                          └─▶ FerretDB (27017)        │  ← 文档 CRUD
│                                 │                     │
│                                 ▼                     │
│                              PostgreSQL               │
└──────────────────────────────────────────────────────┘
```

### 1.2 存储后端切换机制

- 入口：[pool.ts](file:///Users/yangyue/projects/tms-mongodb-web/packages/tmw-kit/src/pg/pool.ts#L8-L18)
  - `TMW_STORAGE_BACKEND === 'ferretdb'` → `isFerretdb() === true`
  - 其它值 → `isMongodb() === true`
- Model 层（如 [model/db.ts](file:///Users/yangyue/projects/tms-mongodb-web/packages/tmw-kit/src/model/db.ts#L16-L19)）通过 `isFerretdb()` 选择存储库：
  - 为 `true` 时实例化 `PgXxxRepository`
  - 为 `false` 时实例化 `MongoXxxRepository`
- 所有 Repository 在 [repo/index.ts](file:///Users/yangyue/projects/tms-mongodb-web/packages/tmw-kit/src/repo/index.ts#L1-L18) 中统一导出，实现同一个接口（[repo/interfaces.ts](file:///Users/yangyue/projects/tms-mongodb-web/packages/tmw-kit/src/repo/interfaces.ts)）。

### 1.3 PostgreSQL 连接池

- 入口：[pool.ts](file:///Users/yangyue/projects/tms-mongodb-web/packages/tmw-kit/src/pg/pool.ts#L1-L65)
- 使用 `pg` 模块创建单例连接池；连接字符串来自 `TMW_POSTGRES_URI`，最大连接数由 `TMW_POSTGRES_MAX_POOL` 控制（默认 10）。
- 只有在 `TMW_STORAGE_BACKEND=ferretdb` 且提供了 `TMW_POSTGRES_URI` 时，`PgPool.available()` 返回 true。

### 1.4 元数据落库

- FerretDB 模式下，数据库、集合、ACL、标签、目录、桶等元数据不再走 `tms_admin.*` 集合，而是分别写入 PostgreSQL 表，例如：
  - `tms_database`（见 [repo/pg/db.ts](file:///Users/yangyue/projects/tms-mongodb-web/packages/tmw-kit/src/repo/pg/db.ts#L1-L137)）
  - 其它表由对应 `PgXxxRepository` 按需自动创建（`CREATE TABLE IF NOT EXISTS`）。
- 业务文档数据仍以 MongoDB 协议写入 FerretDB，由 FerretDB 翻译为 PostgreSQL 的 JSONB 结构存储。

### 1.5 不支持的能力

部分依赖原生 MongoDB 命令或 admin 接口的功能在 FerretDB 模式下会返回不支持提示，见：
- [model/db.ts](file:///Users/yangyue/projects/tms-mongodb-web/packages/tmw-kit/src/model/db.ts#L232-L293)：`getProfilingStatus`、`setProfilingLevel`、`runCommand`
- [controllers/admin/db.ts](file:///Users/yangyue/projects/tms-mongodb-web/packages/tmw-back/src/controllers/admin/db.ts#L336-L380)

## 2. 快速开始（Docker 组合）

项目提供了专用的覆盖 compose 文件：[docker-compose.ferretdb.yml](file:///Users/yangyue/projects/tms-mongodb-web/docker/docker-compose.ferretdb.yml#L1-L65)。

它会启动：
1. **postgres**：基于 `ghcr.io/ferretdb/postgres-documentdb`（PostgreSQL 17 + DocumentDB 扩展），挂载初始化脚本 [ferretdb/init-documentdb.sql](file:///Users/yangyue/projects/tms-mongodb-web/docker/ferretdb/init-documentdb.sql#L1-L1) 启用 `documentdb` 扩展。
2. **mongodb**：实际上是 `ghcr.io/ferretdb/ferretdb:2.7.0`，暴露端口 `37017`，通过 `FERRETDB_POSTGRESQL_URL` 指向上方 postgres。
3. **tmw-aio**：注入 `TMW_STORAGE_BACKEND=ferretdb` 和 `TMW_POSTGRES_URI`。

### 2.1 生产模式

```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.ferretdb.yml up -d
```

### 2.2 开发模式

```bash
cd docker
docker compose -f docker-compose.dev.yml -f docker-compose.ferretdb.yml up -d
```

## 3. 环境变量

以下变量控制 FerretDB / PostgreSQL 模式，完整列表见 [环境变量.md](file:///Users/yangyue/projects/tms-mongodb-web/docs/环境变量.md#L47-L49)。

| 变量                       | 用途                                               | 默认值       |
| -------------------------- | -------------------------------------------------- | ------------ |
| `TMW_STORAGE_BACKEND`      | 存储后端模式，`mongodb`（默认）或 `ferretdb`。     | `mongodb`    |
| `TMW_POSTGRES_URI`         | FerretDB 模式下的 PG 连接地址，如 `postgresql://root:root@postgres:5432/ferretdb`。 | - |
| `TMW_POSTGRES_MAX_POOL`    | PG 连接池最大连接数。                              | `10`         |
| `TMW_MONGODB_HOST`         | FerretDB 服务地址（仍然通过 MongoDB 协议连接）。   | -            |
| `TMW_MONGODB_PORT`         | FerretDB 服务端口（如 `37017`）。                  | `27017`      |
| `TMW_MONGODB_USER`         | FerretDB 用户名。                                  | `root`       |
| `TMW_MONGODB_PASSWORD`     | FerretDB 密码。                                    | `root`       |
| `TMW_MONGODB_AUTH_MECHANISM` | MongoDB 认证机制，在 docker-compose 中连接原生 FerretDB 2.7 时 **不需要** 指定（走 SCRAM-SHA-256 即可）。见 [config/mongodb.js](file:///Users/yangyue/projects/tms-mongodb-web/docker/back/config/mongodb.js#L1-L12) | - |

## 4. 本地直接运行 tmw-back（不用 docker 的 tmw-aio）

先通过 compose 只启动 postgres 和 ferretdb：

```bash
cd docker
docker compose -f docker-compose.yml -f docker-compose.ferretdb.yml up -d postgres mongodb
```

然后在项目根目录构建并启动 `tmw-back`：

```bash
pnpm -r build

export TMW_STORAGE_BACKEND=ferretdb
export TMW_POSTGRES_URI=postgresql://root:root@localhost:5432/ferretdb
export TMW_MONGODB_HOST=localhost
export TMW_MONGODB_PORT=37017
export TMW_MONGODB_USER=root
export TMW_MONGODB_PASSWORD=root
export TMW_APP_AUTH_CAPTCHA_DISABLED=yes
export TMW_APP_PORT=3030
export TMS_KOA_CONFIG_DIR=./docker/back/config

node packages/tmw-back/dist/server
```

> 注意：连接字符串 `mongodb://root:root@localhost:37017/` 无需添加 `authMechanism=PLAIN`。FerretDB 2.x 默认使用 SCRAM-SHA-256。

## 5. 关于 authMechanism=PLAIN（历史遗留说明）

在较早的 FerretDB 或特殊鉴权场景下，部分文档曾建议使用：

```
mongodb://username:password@127.0.0.1/ferretdb?authMechanism=PLAIN
```

但在本项目当前版本的组合中（`ferretdb:2.7.0` + `postgres-documentdb:17`），**不需要** 也 **不建议** 设置 `authMechanism=PLAIN`。保持默认即可，由 [mongodb.js](file:///Users/yangyue/projects/tms-mongodb-web/docker/back/config/mongodb.js#L1-L12) 读取环境变量 `TMW_MONGODB_AUTH_MECHANISM`，未设置时不注入。

如果你仍然希望关闭 `PLAIN` 或自定义，只需确保 **不设置** `TMW_MONGODB_AUTH_MECHANISM`（或留空）。
