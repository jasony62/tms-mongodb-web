## Why

当前 ACL 和 Tag 两个模型在对接 FerretDB（PostgreSQL 后端）时采用了不一致的实现路线——ACL 在每个方法内写 `if (isFerretdb())` 双分支，Tag 在模型层定义了无人调用的 `pg*` 独立方法、controller 却直接操作 MongoDB collection。这种不一致增加了维护成本和认知负担，且存储决策泄露到了 controller 层。

需要统一的 Repository 模式：模型层负责业务逻辑，存储实现对模型透明。

## What Changes

- 新增 `repo/` 层，定义 `IAclRepository` 和 `ITagRepository` 接口
- 为每个接口提供两种实现：`Mongo*Repository` 和 `Pg*Repository`
- 改造 `model/acl.ts`：剥离存储实现到 Repository，模型保留业务逻辑
- 改造 `model/tag.ts` + `admin/tag.ts` + `tagBase.ts` + `tagHelper.ts`：将 controller 对 MongoDB 的直接操作收口到 Repository
- 删除 `model/tag.ts` 中无人使用的 `pg*` 方法（由 `PgTagRepository` 替代）
- 对调用方（其他 model、controller helper）保持完全透明

## Capabilities

### New Capabilities
- `acl-repository`: ACL 存储的 Repository 抽象，MongoDB 和 PostgreSQL 两种实现
- `tag-repository`: Tag 存储的 Repository 抽象，先从 controller 收口到 model，再加两种实现

### Modified Capabilities

无。本 change 不改变任何业务行为，纯重构。

## Impact

- **tmw-kit**: 新增 `src/repo/` 目录；修改 `src/model/acl.ts` 和 `src/model/tag.ts`
- **tmw-back**: 修改 `src/controllers/admin/tag.ts`、`src/controllers/tagBase.ts`、`src/controllers/tagHelper.ts`（收口到 model）
- 对外接口无变化，所有测试应保持通过
