## ADDED Requirements

### Requirement: Bucket invite log repository

The system SHALL provide a repository interface `IBucketInviteRepository` with Mongo and PG implementations for managing bucket invitation records stored in `tms_admin.bucket_invite_log` (Mongo) or `tms_bucket_invite_log` (PG).

The repo SHALL support the following operations:
- `findPending(bucket: string, nickname: string): Promise<InviteDTO | null>` — find pending (not yet accepted) invite for a user in a bucket
- `findValid(bucket: string, code: string, nickname: string, now: Date): Promise<InviteDTO | null>` — find non-expired, non-accepted invite matching bucket/code/nickname
- `findByBucketAndCode(bucket: string, code: string): Promise<InviteDTO | null>` — find invite by bucket and code
- `create(invite: Partial<InviteDTO>): Promise<InviteDTO>` — create invitation record
- `accept(inviteId: string, invitee: string, acceptAt: string): Promise<boolean>` — mark invite as accepted
- `updateExpiry(id: string, expireAt: Date): Promise<boolean>` — update invite expiration

#### Scenario: Find pending invite by bucket and nickname
- **WHEN** an invite exists for bucket "my-bucket" and nickname "Alice" with no acceptAt
- **THEN** `findPending("my-bucket", "Alice")` returns the invite DTO
- **AND** `findPending("my-bucket", "Bob")` returns null (no pending invite for Bob)

#### Scenario: Find valid invite checks expiration
- **WHEN** an invite exists with code "1234", bucket "my-bucket", nickname "Alice", expireAt in the future, and no acceptAt
- **THEN** `findValid("my-bucket", "1234", "Alice", new Date())` returns the invite
- **AND** when expireAt is in the past, returns null

#### Scenario: Create invite with unique code
- **WHEN** creating an invite with bucket "my-bucket", code "abcd", nickname "Alice"
- **THEN** the invite is persisted and returned with an `id`

#### Scenario: Accept invite updates record
- **WHEN** accepting invite "inv1" with invitee "u2" and acceptAt "2026-01-01"
- **THEN** `accept("inv1", "u2", "2026-01-01")` returns true
- **AND** `findPending("my-bucket", "Alice")` returns null (no longer pending)

### Requirement: PG table auto-creation

The PgBucketInviteRepository SHALL auto-create the `tms_bucket_invite_log` table on first use.

The table SHALL include: `id SERIAL PRIMARY KEY, bucket VARCHAR(255), code VARCHAR(64), nickname VARCHAR(255), inviter VARCHAR(255), invitee VARCHAR(255), create_at TIMESTAMP, expire_at TIMESTAMP, accept_at TIMESTAMP, data JSONB DEFAULT '{}'`

#### Scenario: Table created on first access
- **WHEN** PgBucketInviteRepository is instantiated and any method is called
- **THEN** the `tms_bucket_invite_log` table exists in the PG database
