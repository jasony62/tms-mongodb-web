## ADDED Requirements

### Requirement: IDbRepository interface
The system SHALL define `IDbRepository` in `packages/tmw-kit/src/repo/interfaces.ts` for Database data access.

- `findByName(name: string, bucket?: string): Promise<DbDTO | null>`
- `findBySysname(sysname: string, bucket?: string): Promise<DbDTO | null>`
- `create(info: Partial<DbDTO>): Promise<DbDTO>` — inserts and returns the new db record
- `update(id: string, info: Partial<DbDTO>): Promise<boolean>`
- `delete(sysname: string): Promise<boolean>`
- `list(keyword?: string, skip?: number, limit?: number, bucket?: string): Promise<{ databases: DbDTO[]; total: number } | DbDTO[]>`

#### Scenario: findByName returns database
- **WHEN** `findByName` is called with a valid name
- **THEN** it SHALL return the db object or `null`

#### Scenario: findBySysname returns database
- **WHEN** `findBySysname` is called with a valid sysname
- **THEN** it SHALL return the db object or `null`

#### Scenario: create inserts database
- **WHEN** `create` is called with database info
- **THEN** it SHALL insert the record and return the created object with `_id`

#### Scenario: update modifies database
- **WHEN** `update` is called with an id and partial info
- **THEN** it SHALL update the matching record and return `true`

#### Scenario: delete removes database
- **WHEN** `delete` is called with a sysname
- **THEN** it SHALL delete the record and return `true`

#### Scenario: list with pagination
- **WHEN** `list` is called with skip and limit
- **THEN** it SHALL return `{ databases: DbDTO[], total: number }`

#### Scenario: list without pagination
- **WHEN** `list` is called without skip/limit
- **THEN** it SHALL return `DbDTO[]`

#### Scenario: list with keyword
- **WHEN** `list` is called with a keyword
- **THEN** it SHALL filter databases by name/title/description/tag matching the keyword

### Requirement: MongoDbRepository
The system SHALL implement `IDbRepository` as `MongoDbRepository` using `tms_admin.mongodb_object` with `{ type: 'database' }` filter.

#### Scenario: list with adminOnly/acl filtering
- **WHEN** `MongoDbRepository.list` is called
- **THEN** it SHALL only apply pure data filters (keyword, bucket, pagination), NOT adminOnly/ACL logic — those stay in ModelDb

### Requirement: PgDbRepository
The system SHALL implement `IDbRepository` as `PgDbRepository` using the `tms_database` table, auto-creating on first use.

### Requirement: Typed DbDTO
The system SHALL define a `DbDTO` interface.

- Fields: `_id`, `type`, `name`, `sysname`, `title`, `description`, `bucket`, `top`, `aclCheck`, `adminOnly`, `creator`, `created_at`, `updated_at`

### Requirement: ModelDb delegates to IDbRepository
The system SHALL update `ModelDb` to delegate data access to `IDbRepository`, while keeping `checkAcl`, `getProfilingStatus`, `setProfilingLevel`, `runCommand` in the Model.

#### Scenario: byName delegates to repo
- **WHEN** `ModelDb.byName()` is called
- **THEN** it SHALL call `this._dbRepo.findByName()` then apply `checkAcl` business logic
