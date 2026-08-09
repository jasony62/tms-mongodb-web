# 使用 PostgreSQL (FerretDB)

当环境变量 `TMW_STORAGE_BACKEND=ferretdb` 时，系统使用 PostgreSQL 存储元数据。以下为各表结构。

## 表总览

| 表名 | 用途 |
|------|------|
| `tmw_database` | 数据库元数据 |
| `tmw_collection` | 集合元数据 |
| `tmw_schema` | 文档列定义（JSON Schema） |
| `tmw_dir` | 集合分类目录 |
| `tmw_bucket` | 存储空间 |
| `tmw_bucket_invite_log` | 存储空间邀请记录 |
| `tmw_acl` | 访问控制列表（ACL） |
| `tmw_tag` | 标签 |
| `tmw_app_data_action_log` | 数据操作审计日志 |

## 表结构

### tmw_database

数据库元数据。`name` 为逻辑名，`sysname` 为实际系统名。

```sql
CREATE TABLE IF NOT EXISTS tmw_database (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    sysname VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    bucket VARCHAR(255) DEFAULT '',
    top INTEGER DEFAULT 0,
    acl_check BOOLEAN DEFAULT false,
    admin_only BOOLEAN DEFAULT false,
    creator VARCHAR(255) DEFAULT '',
    created_at VARCHAR(50) DEFAULT '',
    updated_at VARCHAR(50) DEFAULT ''
)
```

### tmw_collection

集合元数据。`sysname` 为实际 MongoDB 集合名，`schema_id` 关联 `tmw_schema`。

```sql
CREATE TABLE IF NOT EXISTS tmw_collection (
    id SERIAL PRIMARY KEY,
    mongo_id VARCHAR(64) DEFAULT '',
    name VARCHAR(255) NOT NULL,
    sysname VARCHAR(255) NOT NULL,
    title VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    type VARCHAR(50) DEFAULT 'collection',
    db_sysname VARCHAR(255) DEFAULT '',
    db_name VARCHAR(255) DEFAULT '',
    bucket VARCHAR(255) DEFAULT '',
    dir_full_name VARCHAR(500) DEFAULT '',
    schema_id VARCHAR(255) DEFAULT '',
    ext_schemas JSONB DEFAULT '[]',
    spreadsheet VARCHAR(50) DEFAULT '',
    "orderBy" JSONB DEFAULT '{}',
    acl_check BOOLEAN DEFAULT false,
    doc_acl_check BOOLEAN DEFAULT false,
    admin_only BOOLEAN DEFAULT false,
    tags JSONB DEFAULT '[]',
    doc_field_convert_rules JSONB DEFAULT '{}',
    extensions JSONB DEFAULT '{}',
    creator VARCHAR(255) DEFAULT '',
    created_at BIGINT DEFAULT 0,
    data JSONB DEFAULT '{}'
)
```

### tmw_schema

文档列定义（JSON Schema）。`body` 存放 JSON Schema 定义，`scope` 指定适用范围。

```sql
CREATE TABLE IF NOT EXISTS tmw_schema (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    body JSONB DEFAULT '{}'::jsonb,
    scope VARCHAR(50) DEFAULT 'document',
    db_name VARCHAR(255) DEFAULT '',
    db_sysname VARCHAR(255) DEFAULT '',
    bucket VARCHAR(255) DEFAULT '',
    "order" INTEGER DEFAULT 0,
    creator VARCHAR(255) DEFAULT '',
    created_at VARCHAR(50) DEFAULT ''
)
```

### tmw_dir

集合分类目录，支持层级结构。`full_name` 存储完整路径。

```sql
CREATE TABLE IF NOT EXISTS tmw_dir (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(500) NOT NULL,
    level INTEGER DEFAULT 1,
    title VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    "order" INTEGER DEFAULT 99,
    scope VARCHAR(50) DEFAULT 'collection',
    db_sysname VARCHAR(255) DEFAULT '',
    db_name VARCHAR(255) DEFAULT '',
    bucket VARCHAR(255) DEFAULT ''
)
```

### tmw_bucket

存储空间（多租户工作空间）。`coworkers` 为协作者列表。

```sql
CREATE TABLE IF NOT EXISTS tmw_bucket (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    title VARCHAR(255) DEFAULT '',
    description TEXT DEFAULT '',
    creator VARCHAR(255) DEFAULT '',
    coworkers JSONB DEFAULT '[]',
    data JSONB DEFAULT '{}'
)
```

### tmw_bucket_invite_log

存储空间邀请记录。

```sql
CREATE TABLE IF NOT EXISTS tmw_bucket_invite_log (
    id SERIAL PRIMARY KEY,
    bucket VARCHAR(255) DEFAULT '',
    code VARCHAR(64) DEFAULT '',
    nickname VARCHAR(255) DEFAULT '',
    inviter VARCHAR(255) DEFAULT '',
    invitee VARCHAR(255) DEFAULT '',
    create_at TIMESTAMP DEFAULT NOW(),
    expire_at TIMESTAMP DEFAULT NOW(),
    accept_at TIMESTAMP,
    data JSONB DEFAULT '{}'
)
```

### tmw_acl

访问控制列表。`target_type` 为 `database`/`collection`/`document`。

```sql
CREATE TABLE IF NOT EXISTS tmw_acl (
    id SERIAL PRIMARY KEY,
    target_id VARCHAR(255) NOT NULL,
    target_type VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_remark VARCHAR(255) DEFAULT '',
    rights JSONB DEFAULT '[]'::jsonb,
    UNIQUE(target_id, target_type, user_id)
)
```

### tmw_tag

标签。

```sql
CREATE TABLE IF NOT EXISTS tmw_tag (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bucket VARCHAR(255) DEFAULT '',
    type VARCHAR(50) DEFAULT 'tag',
    UNIQUE(name, bucket)
)
```

### tmw_app_data_action_log

数据操作审计日志。需设置 `TMW_APP_DATA_ACTION_LOG=Y` 启用。

```sql
CREATE TABLE IF NOT EXISTS tmw_app_data_action_log (
    id SERIAL PRIMARY KEY,
    operate_id VARCHAR(255) DEFAULT '',
    operate_dbname VARCHAR(255) NOT NULL,
    operate_clname VARCHAR(255) NOT NULL,
    operate_after_dbname VARCHAR(255) DEFAULT '',
    operate_after_clname VARCHAR(255) DEFAULT '',
    operate_time VARCHAR(50) NOT NULL,
    operate_type VARCHAR(50) NOT NULL,
    operate_account VARCHAR(255) DEFAULT '',
    operate_nickname VARCHAR(255) DEFAULT '',
    operate_before_data JSONB,
    original_data JSONB
)
```

## 注意事项

- 所有表通过 `ensure*Table()` 函数在首次访问时自动创建（`CREATE TABLE IF NOT EXISTS`）
- `tmw_collection` 的 `mongo_id` 字段用于兼容 MongoDB ObjectId
- JSONB 字段用于存储灵活的配置数据（标签、扩展、排序规则等）
