## ADDED Requirements

### Requirement: Bucket metadata CRUD

The system SHALL provide a repository interface `IBucketRepository` with Mongo and PG implementations for managing bucket metadata stored in `tms_admin.bucket` (Mongo) or `tms_bucket` (PG).

The repo SHALL support the following operations:
- `findByName(name: string, bucketName?: string): Promise<BucketDTO | null>` — find by unique name
- `findById(id: string): Promise<BucketDTO | null>` — find by id
- `findByCreatorOrCoworker(userId: string): Promise<BucketDTO[]>` — list buckets accessible by a user (created by or coworker of)
- `create(info: Partial<BucketDTO>): Promise<BucketDTO>` — create a new bucket
- `update(name: string, info: Partial<BucketDTO>): Promise<boolean>` — update bucket by name
- `delete(name: string, creatorId: string): Promise<boolean>` — delete bucket by name and verify ownership
- `addCoworker(name: string, coworker: { id: string; nickname: string; accept_time?: string }): Promise<boolean>` — add a coworker to bucket
- `updateCoworker(name: string, userId: string, data: { nickname?: string; change_time?: string }): Promise<boolean>` — update coworker info
- `removeCoworker(name: string, userId: string): Promise<boolean>` — remove coworker from bucket

#### Scenario: Find bucket by name
- **WHEN** a bucket exists with name "my-bucket"
- **THEN** `findByName("my-bucket")` returns the bucket DTO
- **AND** `findByName("non-existent")` returns null

#### Scenario: Find buckets accessible by user
- **WHEN** user "u1" created bucket "a" and is a coworker of bucket "b"
- **THEN** `findByCreatorOrCoworker("u1")` returns both bucket "a" and bucket "b"

#### Scenario: Create bucket
- **WHEN** creating bucket with name "new-bucket", title "New Bucket"
- **THEN** the bucket is persisted and returned with an `id`

#### Scenario: Update bucket
- **WHEN** updating bucket "my-bucket" with new title "Updated"
- **THEN** `findByName("my-bucket")` returns the updated title

#### Scenario: Delete bucket verifies creator
- **WHEN** deleting bucket "my-bucket" with correct creatorId
- **THEN** the bucket is deleted and returns true
- **AND** when deleting with incorrect creatorId, deletion is rejected

#### Scenario: Add coworker
- **WHEN** adding coworker { id: "u2", nickname: "Alice" } to bucket "my-bucket"
- **THEN** `findByName("my-bucket")` includes u2 in coworkers array

#### Scenario: Remove coworker
- **WHEN** removing coworker "u2" from bucket "my-bucket"
- **THEN** `findByName("my-bucket")` does not include u2 in coworkers array

### Requirement: ModelBucket delegates to repository

The `model/bucket.ts` class SHALL provide business logic (name validation, permission checks) and delegate data access to `IBucketRepository`.

ModelBucket SHALL accept `(mongoClient, bucket, client)` constructor parameters matching the Base class signature.

`isFerretdb()` SHALL determine whether to use `MongoBucketRepository` or `PgBucketRepository`.

#### Scenario: Create with duplicate name
- **WHEN** creating a bucket with a name that already exists
- **THEN** the model returns `[false, "已存在同名存储空间"]`

#### Scenario: Update validates creator
- **WHEN** updating a bucket where `client.id !== bucket.creator`
- **THEN** the model returns `[false, "没有权限"]`

### Requirement: Controller delegates to ModelBucket

The controllers in `tmw-back` SHALL use `ModelBucket` instead of directly calling MongoDB.

Affected controllers:
- `controllers/admin/bucket/main.ts` — create, update, remove, list
- `controllers/mongo/bucket/main.ts` — list
- `controllers/admin/bucket/coworker.ts` — coworker operations (shared with InviteRepo)
- `controllers/mongo/bucket/invite.ts` — accept invite (shared with InviteRepo)
- `ctrl/base.ts` — tmsBeforeEach bucket existence check (uses Repo directly for lightweight access)

#### Scenario: Admin bucket list returns user's buckets
- **WHEN** admin controller `list()` is called
- **THEN** it returns buckets where `creator === client.id` or `coworkers[].id === client.id`

### Requirement: PG table auto-creation

The PgBucketRepository SHALL auto-create the `tms_bucket` table on first use, following the same `ensureXxxTable()` pattern as existing repositories.

The table SHALL include: `id SERIAL PRIMARY KEY, name VARCHAR(255), title VARCHAR(255), description TEXT, creator VARCHAR(255), coworkers JSONB DEFAULT '[]', data JSONB DEFAULT '{}'`

#### Scenario: Table created on first access
- **WHEN** PgBucketRepository is instantiated and any method is called
- **THEN** the `tms_bucket` table exists in the PG database
