## ADDED Requirements

### Requirement: ITagRepository SHALL define 6 methods

The interface SHALL define: `create`, `update`, `remove`, `findByName`, `list`, `checkInUse`.

#### Scenario: Interface has all required methods
- **WHEN** a class implements `ITagRepository`
- **THEN** it SHALL implement all 6 methods with signatures matching business needs

### Requirement: MongoTagRepository SHALL consolidate current Tag operations

`MongoTagRepository` SHALL implement the same logic currently spread across `admin/tag.ts` controller and `tagHelper.ts` for tag CRUD on the `tag_object` MongoDB collection.

#### Scenario: MongoTagRepository.create inserts into tag_object
- **WHEN** `MongoTagRepository.create()` is called with `{ name, bucket }`
- **THEN** it SHALL `insertOne` into `tag_object` collection with `type: 'tag'`

#### Scenario: MongoTagRepository.findByName queries tag_object
- **WHEN** `MongoTagRepository.findByName()` is called
- **THEN** it SHALL `findOne` from `tag_object` by `name` and optional `bucket`

#### Scenario: MongoTagRepository.checkInUse queries mongodb_object
- **WHEN** `MongoTagRepository.checkInUse()` is called with a tag name
- **THEN** it SHALL query `mongodb_object` for documents where `tags` array contains the name

### Requirement: PgTagRepository SHALL produce equivalent SQL operations

`PgTagRepository` SHALL implement tag CRUD using `PgPool` on the `mongodb_tag` table.

#### Scenario: PgTagRepository.create inserts into mongodb_tag
- **WHEN** `PgTagRepository.create()` is called
- **THEN** it SHALL execute `INSERT INTO mongodb_tag (name, bucket, type) VALUES ($1, $2, 'tag') RETURNING id`

#### Scenario: PgTagRepository.checkInUse queries mongodb_object with JSONB
- **WHEN** `PgTagRepository.checkInUse()` is called
- **THEN** it SHALL execute `SELECT 1 FROM mongodb_object WHERE tags @> $1::jsonb AND type = $2 LIMIT 1`

### Requirement: Tag controller SHALL use Tag model instead of direct clTagObj

`admin/tag.ts` SHALL instantiate `Tag` model and call its methods instead of directly accessing `this.clTagObj`.

#### Scenario: Tag.create goes through model
- **WHEN** `admin/tag.ts` `create()` is called
- **THEN** it SHALL create a `Tag` model instance and call `model.create(info)`
- **THEN** it SHALL NOT directly call `this.clTagObj.insertOne()`

#### Scenario: Tag.update goes through model
- **WHEN** `admin/tag.ts` `update()` is called
- **THEN** it SHALL call `model.update(id, info)`
- **THEN** it SHALL NOT directly call `this.clTagObj.updateOne()`

#### Scenario: Tag.remove goes through model
- **WHEN** `admin/tag.ts` `remove()` is called
- **THEN** it SHALL call `model.remove(name, bucketName)`
- **THEN** it SHALL NOT directly call `this.clTagObj.deleteOne()`

#### Scenario: Tag.list goes through model
- **WHEN** `tagBase.ts` `list()` is called
- **THEN** it SHALL call `model.list(bucketName)`
- **THEN** it SHALL NOT directly call `this.clTagObj.find()`

### Requirement: TagHelper.tagByName SHALL delegate to Tag model

`TagHelper.tagByName()` SHALL call `Tag` model's `findByName()` instead of direct `clTagObj.findOne()`.

#### Scenario: Helper delegates to model
- **WHEN** `TagHelper.tagByName()` is called
- **THEN** it SHALL instantiate `Tag` model and call `model.findByName(name, bucket)`

### Requirement: All callers SHALL be unaffected

Other models and controllers that interact with Tag data (e.g. schema model's tag checks) SHALL NOT require changes.

#### Scenario: Schema tag checks still work
- **WHEN** a schema's tag relationship is queried
- **THEN** the behavior SHALL be identical to before the refactoring
