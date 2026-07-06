## ADDED Requirements

### Requirement: IDirRepository interface
The system SHALL define `IDirRepository` in `packages/tmw-kit/src/repo/interfaces.ts` for Directory data access on the `mongodb_object_dir` collection.

- `create(db: { sysname: string; name: string }, info: { name: string; title?: string; description?: string; order?: number }, parentFullName?: string, scope?: string, bucket?: string): Promise<[boolean, any]>`
- `update(id: string, info: { title?: string; description?: string; order?: number }): Promise<[boolean, any]>`
- `delete(id: string): Promise<[boolean, string | null]>`
- `findByFullName(db: { sysname: string } | string, fullName: string, scope?: string, bucket?: string): Promise<any>`
- `listChildren(db: { sysname: string } | string, fullName: string, scope?: string, bucket?: string): Promise<any[]>`
- `list(db: { name: string }, scope?: string): Promise<[boolean, any[]]>`

#### Scenario: create inserts directory
- **WHEN** `create` is called with db, info, optional parentFullName, scope, and bucket
- **THEN** it SHALL insert a new directory document into `mongodb_object_dir`

#### Scenario: create rejects duplicate full_name
- **WHEN** `create` is called with a full_name that already exists
- **THEN** it SHALL return `[false, error message]`

#### Scenario: update modifies directory
- **WHEN** `update` is called with an id and info
- **THEN** it SHALL update title, description, order fields

#### Scenario: delete removes directory
- **WHEN** `delete` is called with an id
- **THEN** it SHALL delete the directory document

#### Scenario: findByFullName returns directory
- **WHEN** `findByFullName` is called with a full name
- **THEN** it SHALL return the matching directory or null

#### Scenario: listChildren returns subdirectories
- **WHEN** `listChildren` is called with a full name
- **THEN** it SHALL return directories whose `full_name` starts with `{fullName}/`

#### Scenario: list returns directories
- **WHEN** `list` is called with a db
- **THEN** it SHALL return directories sorted by level and order

### Requirement: MongoDirRepository
The system SHALL implement `IDirRepository` as `MongoDirRepository` using the `tms_admin.mongodb_object_dir` collection.

### Requirement: PgDirRepository
The system SHALL implement `IDirRepository` as `PgDirRepository` using the `tms_dir` table, auto-creating on first use.

### Requirement: ModelDir delegates to IDirRepository
The system SHALL update `ModelDir` to delegate data access to `IDirRepository`, while keeping `checkClName` validation in the Model.

#### Scenario: create delegates to repo
- **WHEN** `ModelDir.create()` is called
- **THEN** it SHALL validate the name via `checkClName`, check for duplicates via `findByFullName`, then delegate insert to repo
