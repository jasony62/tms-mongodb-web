## Context

Bucket（存储空间）是系统多租户隔离的核心概念，存储在独立的 `tms_admin.bucket` 集合中。与 Schema/Db/Dir/Collection 不同，Bucket 的 CRUD 逻辑不集中在 Model 类（`model/bucket.ts` 为空），而是分布在 5 个 Controller 文件中直接调用 MongoDB 驱动。此外还有独立的邀请记录集合 `tms_admin.bucket_invite_log`。

已完成的 4 个 Repository 改造（Schema/Db/Dir/Collection）定义了一套成熟的模式：接口定义 → Mongo 实现 → PG 实现 → Model 委托 → Controller 调用 Model。

## Goals / Non-Goals

**Goals:**
- 为 Bucket 提供 `IBucketRepository` 接口 + Mongo/PG 双实现，支持 `tms_admin.bucket` 集合的 CRUD 和 coworker 管理
- 为邀请记录提供 `IBucketInviteRepository` 接口 + Mongo/PG 双实现，支持 `tms_admin.bucket_invite_log` 操作
- 将 Controller 中散落的 CRUD 逻辑下沉到 `model/bucket.ts`，再委托给 Repository
- 保持与已完成的 4 个 Repository 一致的代码风格和模式

**Non-Goals:**
- 不改变 tms-koa 路由机制和 Controller 生命周期
- 不修改 Swagger 文档注释
- 不重构邀请流程的业务逻辑，只做数据访问层替换

## Decisions

**1. 拆分两个 Repository 接口**
- `IBucketRepository` 负责 bucket 数据（名称查找、CRUD、coworker 管理）
- `IBucketInviteRepository` 负责邀请记录（创建、查找、接受、过期）
- 理由：两个集合独立，职责分离，与 Schema/Db 等单集合模式一致

**2. CRUD 从 Controller 下沉到 Model**
- 与已有的 Schema/Db/Dir/Collection 模式一致：Model 层做业务规则检查（权限校验、重名检查），Repository 层做数据存取
- `model/bucket.ts` 从空类变为包含完整业务逻辑
- Controller 只负责 HTTP 参数解析和响应格式化

**3. Model 接收三个参数（mongoClient, bucket, client）**
- 与 Base 类构造函数保持一致，子类复用现有的 `clMongoObj`/`clDir`/`clAcl` getter
- `isFerretdb()` 分支在 Model 中通过 getter 选择 Mongo/PG 实现

**4. Controller 中桶访问权限保持双路径**
- `admin/bucket/main.ts` — 管理员 CRUD，使用 Model
- `mongo/bucket/main.ts` — 用户只读列表，使用 Model
- `admin/bucket/coworker.ts` — 协作者管理，使用 Model + InviteModel
- `mongo/bucket/invite.ts` — 接受邀请，使用 Model

**5. PG 表结构**
- `tms_bucket`: `id, name, title, description, creator, coworkers (JSONB), data (JSONB)`
- `tms_bucket_invite_log`: `id, bucket, code, nickname, inviter, invitee, create_at, expire_at, accept_at`

## Risks / Trade-offs

- [重复的 Model 实例化] Controller 中每个方法都需要 `new Bucket(...)` → 与现有模式一致，开销可忽略
- [ctrl/base.ts 中的直接调用] `tmsBeforeEach` 中使用 `findOne({name})` 检查 bucket 存在性 → 改为使用 Repo 而非 Model，保持轻量避免循环引用
- [coworker 操作原子性] invite/accept 涉及两个集合的更新 → invite 和 accept 不跨集合保证事务，与现有行为一致
