## Why

Bucket（存储空间）是系统中独立于 `mongodb_object` 的核心元数据对象，其 CRUD 逻辑目前完全散落在 5 个 Controller 文件中直接调用 MongoDB 驱动，缺少 Repository 抽象层。与已完成的 Schema/Db/Dir/Collection Repository 改造保持一致，实现后端存储解耦和 FerretDB 兼容。

## What Changes

- 新增 `IBucketRepository` 接口 + Mongo/PG 双实现，覆盖 bucket 集合（`tms_admin.bucket`）的 CRUD 和 coworker 管理
- 新增 `IBucketInviteRepository` 接口 + Mongo/PG 双实现，覆盖邀请记录集合（`tms_admin.bucket_invite_log`）的操作
- 填充 `model/bucket.ts`，将 Controller 中的 CRUD 业务逻辑下沉到 Model 层，再委托给 Repository
- 更新 `tmw-back` 中 5 个 Controller 文件，从直接 MongoDB 调用改为使用 Model/Repository
- 更新 `ctrl/base.ts` 中的 bucket 权限检查，改为使用 Repository

## Capabilities

### New Capabilities
- `bucket-repository`: Bucket（存储空间）的 Repository 接口 + Mongo/PG 实现 + Model 层委托
- `bucket-invite-repository`: Bucket 邀请/协作者管理的 Repository 接口 + Mongo/PG 实现

### Modified Capabilities

无（尚无已有 specs）

## Impact

- **`packages/tmw-kit/src/repo/`** — 新增 `interfaces.ts` 中的接口、`mongo/bucket.ts`、`pg/bucket.ts`、`mongo/bucket-invite.ts`、`pg/bucket-invite.ts`
- **`packages/tmw-kit/src/model/bucket.ts`** — 从空类重写为包含完整业务逻辑
- **`packages/tmw-back/src/controllers/admin/bucket/main.ts`** — 改为调用 Model
- **`packages/tmw-back/src/controllers/admin/bucket/coworker.ts`** — 改为调用 Model
- **`packages/tmw-back/src/controllers/mongo/bucket/main.ts`** — 改为调用 Model
- **`packages/tmw-back/src/controllers/mongo/bucket/invite.ts`** — 改为调用 Model
- **`packages/tmw-kit/src/ctrl/base.ts`** — bucket 检查改为调用 Repository
