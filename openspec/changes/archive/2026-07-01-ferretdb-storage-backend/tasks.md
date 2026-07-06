## 1. PgPool 基础模块

- [x] 1.1 新增 `tmw-kit/src/pg/pool.ts`，实现 PgPool 类（连接池 + static available() + 后端模式检测）
- [x] 1.2 在 `tmw-kit/package.json` 新增 `pg` 依赖

## 2. 后端模式开关

- [x] 2.1 在 `tmw-kit/src/pg/pool.ts` 中实现 `TMW_STORAGE_BACKEND` 环境变量读取
- [x] 2.2 实现 `isFerretdb()` / `isMongodb()` 工具函数，供各模块调用

## 3. ACL 模块迁 PG 直接查询

- [x] 3.1 在 `tmw-kit/src/model/acl.ts` 的 `add`/`remove`/`update`/`check`/`clean`/`targetByUser`/`list` 方法中加 `if (ferretdb)` 分支走 `PgPool.query()`
- [x] 3.2 定义 ACL 的 PG 建表 SQL（`target_id`, `target_type`, `user_id`, `rights JSONB`, UNIQUE 约束）

## 4. Tag 模块迁 PG 直接查询

- [x] 4.1 在 `tmw-kit/src/model/tag.ts` 中加 `if (ferretdb)` 分支走 `PgPool.query()`
- [x] 4.2 定义 Tag 的 PG 建表 SQL

## 5. 数据操作日志加 PG 旁路

- [x] 5.1 在 `tmw-kit/src/model/document.ts` 的 `dataActionLog` 方法中加 `if (ferretdb)` 分支写入 PG
- [x] 5.2 定义 data_action_log 的 PG 建表 SQL

## 6. Profiling/Admin 命令适配

- [x] 6.1 在 `tmw-kit/src/model/db.ts` 的 `getProfilingStatus`/`setProfilingLevel`/`runCommand` 中加 `if (ferretdb)` 返回"不支持"
- [x] 6.2 在 `tmw-back/src/controllers/admin/db.ts` 的 profiling 方法中加 `if (ferretdb)` 返回"不支持"

## 7. Docker 部署更新

- [x] 7.1 在 `docker/docker-compose.ferretdb.yml` 中新增 `postgres` + `ferretdb` 服务，顶部注释说明 env 注入方式（tmw-aio 自动，back 需手动 export）
- [x] 7.2 在 `docker/docker-compose.ferretdb.yml` 中将 `postgres` 数据卷从本地路径改为命名卷（`pg-data`），增加持久化
- [x] 7.3 验证 compose 叠加：`docker compose -f docker-compose.yml -f docker-compose.ferretdb.yml config` 正确注入 TMW_ 环境变量，dev 模式通过文档说明手动设置

## 8. 验证

- [x] 8.1 MongoDB 模式（默认）回归验证：ACL/Tag/文档 CRUD 通过 FerretDB MongoDB 协议全部通过
- [x] 8.2 FerretDB 模式文档 CRUD：insert / $regex / $set / $push / pagination 全部通过
- [x] 8.3 FerretDB 模式 ACL/PG 直连验证：add / check / list / remove 全部通过，UNIQUE 约束有效；Tag/log 的 PG 旁路代码已验证
- [x] 8.4 FerretDB 模式 profiling/admin 返回"not supported"：getProfilingStatus / setProfilingLevel 均正确拒绝
- [x] 8.5 新增环境变量文档化（`TMW_STORAGE_BACKEND`, `TMW_POSTGRES_URI`, `TMW_POSTGRES_MAX_POOL`）
