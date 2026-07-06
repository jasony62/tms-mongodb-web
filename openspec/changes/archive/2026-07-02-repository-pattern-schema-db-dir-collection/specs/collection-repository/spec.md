## ADDED Requirements

### Requirement: ICollectionRepository interface
The system SHALL define `ICollectionRepository` in `packages/tmw-kit/src/repo/interfaces.ts` for Collection metadata access on `tms_admin.mongodb_object` with `{ type: 'collection' }`.

- `findById(tmwDb: { sysname: string } | string, id: string, bucket?: string): Promise<any>`
- `findByName(tmwDb: { sysname: string } | string, name: string, bucket?: string): Promise<any>`
- `findBySysname(db: { sysname: string }, sysname: string, bucket?: string): Promise<any>`
- `create(collection: any): Promise<any>` — inserts into `mongodb_object` collection
- `update(id: string, info: any): Promise<[boolean, any]>`
- `delete(id: string): Promise<boolean>`
- `list(dbSysname: string, dirFullName?: string, keyword?: string, skip?: number, limit?: number, bucket?: string): Promise<{ collections: any[]; total: number } | any[]>`
- `processCl(collections: any[], mongoClient: any, bucket?: any): Promise<any[]>` — fills schema_name/parentName/order

#### Scenario: findById returns collection
- **WHEN** `findById` is called with a db and id
- **THEN** it SHALL return the collection object or null

#### Scenario: findByName returns collection
- **WHEN** `findByName` is called with a db and name
- **THEN** it SHALL return the collection object or null

#### Scenario: findBySysname returns collection
- **WHEN** `findBySysname` is called with a db and sysname
- **THEN** it SHALL return the collection object or null

#### Scenario: list with pagination
- **WHEN** `list` is called with dbSysname, skip, and limit
- **THEN** it SHALL return `{ collections: any[], total: number }`

#### Scenario: processCl fills schema info
- **WHEN** `processCl` is called with collections
- **THEN** it SHALL batch-query schemas and fill `schema_name`, `schema_parentName`, `schema_order` on each collection

### Requirement: MongoCollectionRepository
The system SHALL implement `ICollectionRepository` as `MongoCollectionRepository` using `tms_admin.mongodb_object` with `{ type: 'collection' }` filter.

### Requirement: PgCollectionRepository
The system SHALL implement `ICollectionRepository` as `PgCollectionRepository` using the `tms_collection` table, auto-creating on first use.

### Requirement: ModelCollection delegates to ICollectionRepository
The system SHALL update `ModelCollection` to delegate metadata CRUD to `ICollectionRepository`, while keeping physical DB operations (createCollection/dropCollection), ACL enforcement, ES config, and schema/spreadsheet lifecycle management in the Model.

#### Scenario: create delegates meta insert to repo
- **WHEN** `ModelCollection.create()` is called
- **THEN** it SHALL validate the name, generate sysname, set defaults, then call repo for metadata insert; physical `createCollection` stays in Model

#### Scenario: remove delegates meta delete to repo
- **WHEN** `ModelCollection.remove()` is called
- **THEN** it SHALL delegate `deleteOne` to repo, then handle `dropCollection`, schema removal, and spreadsheet cleanup in Model
