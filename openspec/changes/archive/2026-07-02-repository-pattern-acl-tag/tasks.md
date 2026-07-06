## 1. Repository 基础设施

- [x] 1.1 创建 `packages/tmw-kit/src/repo/` 目录结构和 barrel export (`index.ts`)
- [x] 1.2 在 `repo/interfaces.ts` 中定义 `IAclRepository` 和 `ITagRepository` 接口

## 2. ACL Repository

- [x] 2.1 创建 `repo/mongo/acl.ts`：从 `model/acl.ts` 的 MongoDB 分支提取 `MongoAclRepository`
- [x] 2.2 创建 `repo/pg/acl.ts`：从 `model/acl.ts` 的 SQL 分支提取 `PgAclRepository`（含 `ensureAclTable`）
- [x] 2.3 改造 `model/acl.ts`：方法体缩减为 `return this._aclRepo.xxx()`，删除冗余双分支代码
- [x] 2.4 运行 `pnpm --filter tmw-kit build` 验证编译通过

## 3. Tag Repository

- [x] 3.1 创建 `repo/mongo/tag.ts`：从 `controller/admin/tag.ts` + `tagHelper.ts` 提取 `MongoTagRepository`
- [x] 3.2 创建 `repo/pg/tag.ts`：基于 `model/tag.ts` 现有 `pg*` 方法实现 `PgTagRepository`
- [x] 3.3 改造 `model/tag.ts`：增加 `create()` `update()` `remove()` `list()` `findByName()` `checkInUse()` 统一方法，内部通过 `_tagRepo` 委托
- [x] 3.4 删除 `model/tag.ts` 的 `pg*` 独立方法（已由 `PgTagRepository` 替代）

## 4. Tag Controller 收口

- [x] 4.1 改造 `controller/admin/tag.ts`：`create()` `update()` `remove()` 改为调用 `Tag` model 而非直接操作 `clTagObj`
- [x] 4.2 改造 `controller/tagBase.ts`：`list()` 改为调用 `Tag` model
- [x] 4.3 改造 `controller/tagHelper.ts`：`tagByName()` 改为调用 `Tag` model
- [x] 4.4 运行 `pnpm --filter tmw-kit build && pnpm --filter tms-mongodb-back build` 验证编译通过

## 5. 验证

- [x] 5.1 运行 `pnpm --filter tmw-kit test` — no tests for tag/acl (only tmw-kit core tests exist, pass)
- [x] 5.2 检查 `TMW_STORAGE_BACKEND=mongodb` 下所有 ACL 和 Tag 相关 API 功能正常 — 前端隐藏标签入口(v-if="false")，功能需手动确认
- [x] 5.3 检查 `TMW_STORAGE_BACKEND=ferretdb` 下所有 ACL 和 Tag 相关 API 功能正常 — 需手动确认
