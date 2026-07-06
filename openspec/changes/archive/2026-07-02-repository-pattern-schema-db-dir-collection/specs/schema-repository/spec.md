## ADDED Requirements

### Requirement: ISchemaRepository interface
The system SHALL define `ISchemaRepository` in `packages/tmw-kit/src/repo/interfaces.ts` with typed methods for Schema data access.

- `findById(id: string, bucket?: string, dbName?: string): Promise<SchemaDTO | null>`
- `findByIds(ids: ObjectId[], options?: { projection?: any }): Promise<SchemaDTO[]>`
- `findByName(name: string, options?: { onlyProperties?: boolean, dbName?: string | null, scope?: string, bucket?: string }): Promise<any>`
- `listSimple(dbName: string, scope?: string, bucket?: string): Promise<SchemaDTO[]>`
- `deleteById(id: string, bucket?: string): Promise<boolean>`

#### Scenario: findById returns schema
- **WHEN** `findById` is called with a valid schema id
- **THEN** it SHALL return the schema object with all fields, or `null` if not found

#### Scenario: findByIds returns multiple schemas
- **WHEN** `findByIds` is called with an array of schema ObjectIds
- **THEN** it SHALL return an array of matching schema objects

#### Scenario: findByName returns schema by name
- **WHEN** `findByName` is called with a schema name and optional dbName/scope/bucket
- **THEN** it SHALL return the matching schema or `null`

#### Scenario: findByName supports scope filtering
- **WHEN** `findByName` is called with a scope parameter
- **THEN** it SHALL filter schemas by the specified scope

#### Scenario: listSimple returns schema list
- **WHEN** `listSimple` is called with a dbName and scope
- **THEN** it SHALL return an array of schemas with only `_id`, `title`, `description`, `scope`, `db` fields, sorted by `order`

#### Scenario: deleteById removes schema
- **WHEN** `deleteById` is called with a valid id
- **THEN** it SHALL delete the schema document and return `true`

### Requirement: MongoSchemaRepository
The system SHALL implement `ISchemaRepository` as `MongoSchemaRepository` using the `tms_admin.mongodb_object` collection with `{ type: 'schema' }` filter.

#### Scenario: constructor receives mongoClient
- **WHEN** `MongoSchemaRepository` is instantiated with a MongoClient
- **THEN** it SHALL store the client and query `tms_admin.mongodb_object` collection

### Requirement: PgSchemaRepository
The system SHALL implement `ISchemaRepository` as `PgSchemaRepository` using the `tms_schema` table, auto-creating the table on first use via `ensureSchemaTable()`.

#### Scenario: constructor no args
- **WHEN** `PgSchemaRepository` is instantiated
- **THEN** it SHALL use `PgPool` for queries and auto-create the table on first operation

### Requirement: Typed SchemaDTO
The system SHALL define a `SchemaDTO` interface for typed return values.

- Fields: `_id`, `type`, `name`, `title`, `description`, `body` (with `properties`), `scope`, `db`, `bucket`, `order`, `creator`, `created_at`
- Type: `{ _id: any; type: string; name: string; title?: string; description?: string; body?: { properties: any }; scope?: string; db?: { name: string; sysname?: string }; bucket?: string; order?: number; creator?: string; [key: string]: any }`

### Requirement: ModelSchema delegates to ISchemaRepository
The system SHALL update `ModelSchema` to create and delegate to `ISchemaRepository` via `isFerretdb()` branching (same pattern as existing ModelAcl/ModelTag).

#### Scenario: bySchemaId delegates
- **WHEN** `ModelSchema.bySchemaId()` is called
- **THEN** it SHALL call `this._schemaRepo.findById()` then apply business logic (ACL check, onlyProperties filtering)
