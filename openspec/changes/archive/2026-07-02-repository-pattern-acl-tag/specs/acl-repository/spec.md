## ADDED Requirements

### Requirement: ACL model SHALL delegate storage operations to a Repository

Acl model's methods SHALL call repository methods instead of containing inline MongoDB/SQL logic.

#### Scenario: Acl.add delegates to repo
- **WHEN** `Acl.add()` is called
- **THEN** it SHALL call `this._aclRepo.add()` with the same arguments
- **THEN** the return value SHALL be identical to the repo's return value

#### Scenario: Acl.remove delegates to repo
- **WHEN** `Acl.remove()` is called
- **THEN** it SHALL call `this._aclRepo.remove()` with the same arguments

#### Scenario: Acl.update delegates to repo
- **WHEN** `Acl.update()` is called
- **THEN** it SHALL call `this._aclRepo.update()` with the same arguments

#### Scenario: Acl.check delegates to repo
- **WHEN** `Acl.check()` is called
- **THEN** it SHALL call `this._aclRepo.check()` with the same arguments

#### Scenario: Acl.clean delegates to repo
- **WHEN** `Acl.clean()` is called
- **THEN** it SHALL call `this._aclRepo.clean()` with the same arguments

#### Scenario: Acl.targetByUser delegates to repo
- **WHEN** `Acl.targetByUser()` is called
- **THEN** it SHALL call `this._aclRepo.targetByUser()` with the same arguments

#### Scenario: Acl.list delegates to repo
- **WHEN** `Acl.list()` is called
- **THEN** it SHALL call `this._aclRepo.list()` with the same arguments

### Requirement: IAclRepository SHALL define 7 methods

The interface SHALL define: `add`, `remove`, `update`, `check`, `clean`, `targetByUser`, `list`.

#### Scenario: Interface matches Acl usage
- **WHEN** a class implements `IAclRepository`
- **THEN** it SHALL implement all 7 methods with matching signatures

### Requirement: MongoAclRepository SHALL produce equivalent MongoDB operations

`MongoAclRepository` SHALL execute the same `clAcl` operations currently in `Acl` methods' MongoDB branches.

#### Scenario: MongoAclRepository.add inserts ACL via clAcl
- **WHEN** `MongoAclRepository.add()` is called
- **THEN** it SHALL call `this.clAcl.updateOne()` with upsert and `$push` operator

#### Scenario: MongoAclRepository.check queries via clAcl
- **WHEN** `MongoAclRepository.check()` is called
- **THEN** it SHALL call `this.clAcl.findOne()` with `$elemMatch` on `acl.user.id`

### Requirement: PgAclRepository SHALL produce equivalent SQL operations

`PgAclRepository` SHALL execute the same `PgPool` SQL currently in `Acl` methods' FerretDB branches.

#### Scenario: PgAclRepository.add inserts ACL via PgPool
- **WHEN** `PgAclRepository.add()` is called
- **THEN** it SHALL execute `INSERT INTO mongodb_object_acl ... ON CONFLICT DO NOTHING`

#### Scenario: PgAclRepository.check queries via PgPool
- **WHEN** `PgAclRepository.check()` is called
- **THEN** it SHALL execute `SELECT rights FROM mongodb_object_acl WHERE ...`

### Requirement: Acl model SHALL select repository based on backend

The getter `_aclRepo` SHALL return `PgAclRepository` when `isFerretdb()` is true, otherwise `MongoAclRepository`.

#### Scenario: Ferretdb path selects PgRepo
- **WHEN** `TMW_STORAGE_BACKEND=ferretdb`
- **THEN** `isFerretdb()` returns true
- **THEN** `_aclRepo` SHALL return `PgAclRepository` instance

#### Scenario: MongoDB path selects MongoRepo
- **WHEN** `TMW_STORAGE_BACKEND` is not `ferretdb`
- **THEN** `isMongodb()` returns true
- **THEN** `_aclRepo` SHALL return `MongoAclRepository` instance

### Requirement: All callers SHALL be unaffected

All existing callers of `Acl` methods (`model/db.ts`, `model/collection.ts`, `model/document.ts`, `controllers/aclHelper.ts`) SHALL NOT require changes.

#### Scenario: Db model still uses _modelAcl
- **WHEN** `Db._modelAcl.check()` is called
- **THEN** it SHALL work identically to before the refactoring

#### Scenario: AclHelper still uses ModelAcl
- **WHEN** `AclHelper.add()` is called
- **THEN** it SHALL work identically to before the refactoring
