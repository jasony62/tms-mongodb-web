## Why

当前 `ModelSchema`、`ModelDb`、`ModelDir`、`ModelCollection` 直接通过 MongoDB Driver 操作 `tms_admin.mongodb_object` 和 `mongodb_object_dir` 集合，数据存取逻辑与业务编排耦合在一起。已有 Acl/Tag 两个对象成功应用了 Repository 模式（`IAclRepository`/`ITagRepository` + Mongo/PG 双实现）。将此模式推广到 Schema/Db/Dir/Collection 四个对象，可以解耦数据层、统一后端切换逻辑（`isFerretdb()`）、并提高可测试性。

## What Changes

- 为 Schema/Db/Dir/Collection 四个业务对象定义 Repository 接口（`ISchemaRepository`、`IDbRepository`、`IDirRepository`、`ICollectionRepository`）
- 每个接口提供 Mongo 和 PG 两种实现
- Model 层从直接调用 MongoDB Driver 改为委托给 Repository，业务编排（ACL 检查、ES 同步、物理集合操作等）保留在 Model 层
- 引入类型定义（DTO），逐步减少 `any` 使用

## Capabilities

### New Capabilities
- `schema-repository`: Schema 对象的数据存取，包含 findById/findByIds/findByName/listSimple/deleteById
- `db-repository`: Database 对象的数据存取，包含 findByName/findBySysname/create/update/delete/list
- `dir-repository`: Directory 对象的数据存取，包含 create/update/delete/findByFullName/listChildren/list
- `collection-repository`: Collection 对象元数据存取，包含 findById/findByName/findBySysname/create/update/delete/list/processCl

### Modified Capabilities

无 — 不改变已有能力的规格行为

## Impact

- `packages/tmw-kit/src/repo/` — 新增 4 个接口 + 8 个实现文件
- `packages/tmw-kit/src/model/` — `schema.ts`, `db.ts`, `dir.ts`, `collection.ts` 改为委托 Repository
- `packages/tmw-kit/src/pg/` — PG 实现需要新增 `tms_schema`, `tms_database`, `tms_dir`, `tms_collection` 表（自动建表）
- 现有 controllers/helpers 调用方不受影响（接口不变）
