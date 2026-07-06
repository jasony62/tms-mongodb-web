## Why

当前系统强绑定 MongoDB 作为唯一存储引擎。目标是在不重写核心代码的前提下，提供 PostgreSQL 作为可选的存储后端，逐步降低对 MongoDB 的依赖，最终实现部署时可选择 MongoDB 或 PostgreSQL。

## What Changes

- 引入 FerretDB 作为翻译层，使 MongoDB 驱动协议可以写入 PostgreSQL，覆盖文档 CRUD 核心路径
- 新增 `PgPool` 模块，供关系型模块（ACL、Tag、日志）直接走 SQL 访问 PostgreSQL
- 新增 `TMW_STORAGE_BACKEND=mongodb|ferretdb` 环境变量开关，部署时指定后端
- MongoDB 特定的管理功能（profiling、admin command）在 ferretdb 模式下返回"不支持"
- 系统在 ferretdb 模式下连接的目标地址从 MongoDB 切换为 FerretDB，驱动层零改动

## Capabilities

### New Capabilities
- `storage-backend-switch`: 通过环境变量切换存储后端（mongodb / ferretdb），兼容现有代码
- `pg-direct-access`: 关系型模块直接通过 PgPool 访问 PostgreSQL，不走 FerretDB
- `ferretdb-gateway`: FerretDB 作为文档存储网关，处理 MongoDB 驱动的文档 CRUD 查询

### Modified Capabilities

（无现有 spec 被修改）

## Impact

- **新增依赖**: FerretDB 服务、PostgreSQL 数据库、`pg` Node.js 驱动包
- **修改代码**: 5 个已有源文件（`acl.ts`, `tag.ts`, `db.ts`, `document.ts`, `controllers/admin/db.ts`），新增 `src/pg/pool.ts`
- **部署变更**: 需要运行 FerretDB 容器和 PostgreSQL 实例，新增环境变量 `TMW_STORAGE_BACKEND`、`TMW_POSTGRES_URI`
- **前端无影响**: API 路径和返回格式不变
