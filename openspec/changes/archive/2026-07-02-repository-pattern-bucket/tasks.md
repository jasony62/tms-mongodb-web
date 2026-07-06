## 1. Interfaces and DTOs

- [x] 1.1 Define `BucketDTO` interface in `repo/interfaces.ts`
- [x] 1.2 Define `InviteDTO` interface in `repo/interfaces.ts`
- [x] 1.3 Define `IBucketRepository` interface in `repo/interfaces.ts`
- [x] 1.4 Define `IBucketInviteRepository` interface in `repo/interfaces.ts`
- [x] 1.5 Export new interfaces from `repo/index.ts`

## 2. Bucket Repository — Mongo Implementation

- [x] 2.1 Implement `MongoBucketRepository` in `repo/mongo/bucket.ts`
- [x] 2.2 Update `repo/index.ts` to export MongoBucketRepository

## 3. Bucket Repository — PG Implementation

- [x] 3.1 Implement `PgBucketRepository` in `repo/pg/bucket.ts` with `tms_bucket` table
- [x] 3.2 Update `repo/index.ts` to export PgBucketRepository

## 4. Bucket Invite Repository — Mongo Implementation

- [x] 4.1 Implement `MongoBucketInviteRepository` in `repo/mongo/bucket-invite.ts`
- [x] 4.2 Update `repo/index.ts` to export MongoBucketInviteRepository

## 5. Bucket Invite Repository — PG Implementation

- [x] 5.1 Implement `PgBucketInviteRepository` in `repo/pg/bucket-invite.ts` with `tms_bucket_invite_log` table
- [x] 5.2 Update `repo/index.ts` to export PgBucketInviteRepository

## 6. ModelBucket — Business Logic

- [x] 6.1 Update `model/bucket.ts` with create/update/remove/list/invite/acceptInvite/removeCoworker methods delegating to repositories
- [x] 6.2 Ensure `isFerretdb()` branch selects correct repository implementation

## 7. Controller Updates

- [x] 7.1 Update `controllers/admin/bucket/main.ts` to use ModelBucket
- [x] 7.2 Update `controllers/mongo/bucket/main.ts` to use ModelBucket
- [x] 7.3 Update `controllers/admin/bucket/coworker.ts` to use ModelBucket + ModelBucketInvite
- [x] 7.4 Update `controllers/mongo/bucket/invite.ts` to use ModelBucket + ModelBucketInvite

## 8. ctrl/base.ts Bucket Check

- [x] 8.1 Update `ctrl/base.ts` `tmsBeforeEach` to use IBucketRepository directly

## 9. Verification

- [x] 9.1 Build tmw-kit package (`pnpm --filter tmw-kit build`) — PASS
- [x] 9.2 Build tmw-back package (`pnpm --filter tms-mongodb-back build`) — PASS
