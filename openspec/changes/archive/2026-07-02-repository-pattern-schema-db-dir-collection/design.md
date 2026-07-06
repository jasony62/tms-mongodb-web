## Context

`packages/tmw-kit/src/model/` 中 4 个 Model 类（`ModelSchema`、`ModelDb`、`ModelDir`、`ModelCollection`）通过 `Base.clMongoObj`（即 `tms_admin.mongodb_object` 集合）直接调用 MongoDB Driver。已有 `Acl` 和 `Tag` 成功迁移到 Repository 模式（接口定义在 `packages/tmw-kit/src/repo/interfaces.ts`，Mongo 和 PG 双实现），验证了该模式的可行性。

当前数据访问结构：
- `tms_admin.mongodb_object` — 通用元数据集合，通过 `type` 字段区分领域（`database`/`collection`/`schema`）
- `tms_admin.mongodb_object_dir` — 目录集合（Dir 专用）
- 存储后端通过 `TMW_STORAGE_BACKEND` 环境变量切换（mongodb/ferretdb），Model 层用 `isFerretdb()` 分支

## Goals / Non-Goals

**Goals:**
- 为 Schema/Db/Dir/Collection 定义 Repository 接口和 typed DTO
- 提供 Mongo 和 PG 两种实现（PG 实现创建独立表）
- Model 层改为委托 Repository 做数据存取，业务编排保留在 Model
- 保持与现有控制器/Helper 的接口兼容（不破坏调用方）

**Non-Goals:**
- 不改变 `checkAcl`、`processBeforeStore`、`assembleQuery` 等业务逻辑的实现位置
- 不重构 `ModelCollection` 和 `ModelDoc` 的跨模型编排逻辑（只在当前层级做委托）
- 不涉及 `Bucket`、`Document`、`Spreadsheet` 的迁移

## Decisions

### 1. 每个 Repository 一个独立接口文件 vs 集中到 interfaces.ts

**决定**：所有接口集中在 `interfaces.ts`（与现有 Acl/Tag 保持一致）

**理由**：接口都很精简（5-8 个方法），放在同一个文件里方便浏览 import 路径一致。如果未来膨胀可以拆分。

### 2. 接口方法命名风格

**决定**：使用 findById/findByName 风格（而非 byId/byName）

**理由**：与现有 Acl/Tag 的 `check()`/`list()`/`clean()` 风格不完全一致，但更符合 Repository 模式的命名惯例，且新接口独立定义不受旧命名约束。

### 3. PG 表结构设计

**决定**：每个 Repository 使用独立 PG 表，而非一个 `mongodb_object` 表加 type 列

**理由**：
- 现有 Acl/Tag 也是独立表（`mongodb_object_acl`、`mongodb_tag`），延续此模式
- 独立表字段更精确，避免 JSONB 大量使用
- 查询性能更好（不需要 type 过滤）

表结构：
- `tms_schema` — id, name, title, description, body(JSONB), scope, db_name, db_sysname, bucket, "order", creator, created_at
- `tms_database` — id, name, sysname, title, description, bucket, top, acl_check, admin_only, creator, created_at
- `tms_dir` — id, name, full_name, level, title, description, "order", scope, db_sysname, db_name, bucket
- `tms_collection` — id, name, sysname, title, description, db_sysname, db_name, schema_id, ext_schemas(JSONB), spreadsheet, order_by(JSONB), acl_check, doc_acl_check, admin_only, tags(JSONB), doc_field_convert_rules(JSONB), extensions(JSONB), bucket, creator, created_at

### 4. 分页查询返回值

**决定**：当 skip/limit 都传时返回 `{ items, total }` 结构，不传时返回 `items[]`

**理由**：与现有 `ModelDb.list()` 和 `ModelCollection.list()` 的行为一致

### 5. ISchemaRepository.deleteById 中"是否在使用"的检查

**决定**：检查逻辑留在 `ModelSchema`，Repository 只做 deleteOne

**理由**：业务规则检查（schema 被 collection 引用时不能删除）属于业务逻辑，不属于数据存取职责

## Risks / Trade-offs

- **现有 Model 基类 `Base.clMongoObj` 仍被其他 Model 使用**：`ModelSchema`/`ModelDb`/`ModelCollection` 改为委托 repo 后，`clMongoObj` 可能不再被这些子类直接调用，但 `Base` 类和其他 Model 仍需保留它。这是一个渐进式迁移，最终可以清理。
- **PG 实现的数据一致性**：MongoDB 和 PostgreSQL 中元数据可能不同步。目前 PG 实现只在 FerretDB 模式下使用，FerretDB 本身就是一个 PG 之上的 MongoDB 协议层，所以元数据不会同时存在于两个后端。风险可控。
- **`ModelCollection.list()` 的 ACL 分支逻辑复杂**：该方法包含大量业务条件组装（`queryAclCheck`、`adminOnly`、bucket 过滤等），这些将保留在 Model 层不走 repo。Repo 的 `list()` 只处理纯数据层过滤（db_sysname、dir、keyword、分页），由 Model 层预处理 query 或后处理 result。
