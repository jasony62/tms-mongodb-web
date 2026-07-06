## Context

当前 ACL 和 Tag 两个模块在对接 FerretDB（PostgreSQL 后端）时采用了不一致的实现方式：

- **ACL** (`model/acl.ts`)：每个方法内部写 `if (isFerretdb()) { SQL } else { MongoDB }` 双分支。对调用方透明，但方法体翻倍。
- **Tag** (`model/tag.ts`)：定义了 `pg*` 独立方法，但没有任何 controller 调用它们——controller (`admin/tag.ts`, `tagBase.ts`, `tagHelper.ts`) 直接操作 `this.clTagObj` MongoDB collection。

存储决策泄漏到了 controller 层。需要统一为 Repository 模式。

## Goals / Non-Goals

**Goals:**
- 定义 `IAclRepository` 和 `ITagRepository` 接口
- 为每个接口提供 `Mongo*Repository` 和 `Pg*Repository` 两种实现
- 改造 `Acl` model，剥离存储实现，保留业务逻辑
- 改造 `Tag` model + controller，将 clTagObj 的直接操作收口
- 所有调用方无感知（接口不变，行为不变）

**Non-Goals:**
- 不影响其他业务对象（Db、Collection、Schema、Dir 等）的存储方式
- 不改变 `assembleQuery()` 的 MongoDB 查询语义
- 不引入新的外部依赖

## Decisions

### 1. Repository 接口层位置 → `src/repo/`

选择独立目录而非放在 `src/model/repo/`，原因是 Repository 是独立的概念层次，不属于 model。

```
packages/tmw-kit/src/repo/
  ├── index.ts              // barrel export
  ├── interfaces.ts          // IAclRepository, ITagRepository
  ├── mongo/
  │   ├── acl.ts
  │   └── tag.ts
  └── pg/
      ├── acl.ts
      └── tag.ts
```

### 2. Model 获取 Repository 的方式 → getter + DI

保持现有模式：Model 通过 getter 惰性获取 Repository 实例，避免构造函数签名变更。

```typescript
private get _aclRepo(): IAclRepository {
  return isFerretdb()
    ? new PgAclRepository(this.mongoClient, this.bucket, this.client)
    : new MongoAclRepository(this.mongoClient, this.bucket, this.client)
}
```

**替代方案考虑**：构造函数注入或 IoC 容器。但现有代码所有 model 都继承自 `Base` 且构造函数签名固定 `(mongoClient, bucket, client)`，改动签名会影响所有调用方。getter 模式最轻量。

### 3. Repository 构造函数签名 → 与 Model 对齐

```typescript
constructor(
  private mongoClient: MongoClient,
  private bucket: any,
  private client: any
) {}
```

与 `Base` 和所有 model 的构造函数签名一致，便于复用。

### 4. Tag 的收口策略 → controller 改为调用 model

现有 `admin/tag.ts` 直接操作 `this.clTagObj`，改造步骤：
1. 先创建 `MongoTagRepository`（从 controller 提取逻辑）
2. 改造 `model/tag.ts`：加 `create()` `update()` `remove()` `list()` `findByName()` 等统一方法
3. 改造 controller：`admin/tag.ts` 改为通过 model 调用
4. `TagHelper` 的 `tagByName()` 也迁移到 model
5. `PgTagRepository` 替代现有 `pg*` 方法

### 5. `ensureTable` 初始化 → 在 Repository 中惰性初始化

保持 ACL 现有的 `ensureAclTable()` 模式。PG repository 在第一次调用时自动建表。提取一个公共 helper 来消除重复。

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Tag 的 `checkInUse()` 需要查 `mongodb_object.tags` 数组字段 | Repository 方法使用 JSONB `@>` 操作符（PG）或 `$elemMatch`（MongoDB），保持语义等价 |
| Tag controller 中 `remove` 检查 tag 是否被 schema 使用，直接操作 `clMongoObj` | 通过 model 委托给 Tag model，Tag model 再通过 Db/Collection model 或直接 repo 查询 |
| 双实现需要维护两套 CRUD 逻辑 | 接口契约约束行为等价；ACL 的 SQL 分支已通过生产验证 |
