## 1. Interfaces and DTOs

- [x] 1.1 Define `SchemaDTO` interface in `repo/interfaces.ts`
- [x] 1.2 Define `ISchemaRepository` interface in `repo/interfaces.ts`
- [x] 1.3 Define `DbDTO` interface in `repo/interfaces.ts`
- [x] 1.4 Define `IDbRepository` interface in `repo/interfaces.ts`
- [x] 1.5 Define `IDirRepository` interface in `repo/interfaces.ts`
- [x] 1.6 Define `ICollectionRepository` interface in `repo/interfaces.ts`
- [x] 1.7 Export all new interfaces from `repo/index.ts`

## 2. Schema Repository

- [x] 2.1 Implement `MongoSchemaRepository` in `repo/mongo/schema.ts`
- [x] 2.2 Implement `PgSchemaRepository` in `repo/pg/schema.ts` with `tms_schema` table
- [x] 2.3 Update `ModelSchema` to delegate to `ISchemaRepository`

## 3. Db Repository

- [x] 3.1 Implement `MongoDbRepository` in `repo/mongo/db.ts`
- [x] 3.2 Implement `PgDbRepository` in `repo/pg/db.ts` with `tms_database` table
- [x] 3.3 Update `ModelDb` to delegate to `IDbRepository`

## 4. Dir Repository

- [x] 4.1 Implement `MongoDirRepository` in `repo/mongo/dir.ts`
- [x] 4.2 Implement `PgDirRepository` in `repo/pg/dir.ts` with `tms_dir` table
- [x] 4.3 Update `ModelDir` to delegate to `IDirRepository`

## 5. Collection Repository

- [x] 5.1 Implement `MongoCollectionRepository` in `repo/mongo/collection.ts`
- [x] 5.2 Implement `PgCollectionRepository` in `repo/pg/collection.ts` with `tms_collection` table
- [x] 5.3 Update `ModelCollection` to delegate to `ICollectionRepository`

## 6. Verification

- [x] 6.1 Build tmw-kit package (`pnpm --filter tmw-kit build`) — PASS
- [x] 6.2 Build tmw-back package (`pnpm --filter tmw-back build`) — PASS
- [ ] 6.3 Run tmw-kit tests (`pnpm --filter tmw-kit test`) — pre-existing ESM/Jest config issue, not related to changes
