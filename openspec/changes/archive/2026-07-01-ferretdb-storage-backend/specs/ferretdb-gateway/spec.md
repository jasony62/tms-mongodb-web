## ADDED Requirements

### Requirement: Document CRUD through FerretDB

In ferretdb mode, all document/collection CRUD operations SHALL be handled by FerretDB translating MongoDB Wire Protocol to PostgreSQL.

#### Scenario: Document queries work through FerretDB

- **WHEN** `TMW_STORAGE_BACKEND=ferretdb`
- **AND** application performs `find`, `insertOne`, `updateOne`, `deleteOne` operations
- **THEN** requests SHALL reach FerretDB at the configured `TMW_MONGODB_URI`
- **AND** results SHALL be identical in structure to MongoDB mode

#### Scenario: Existing Model layer code unchanged

- **WHEN** `TMW_STORAGE_BACKEND=ferretdb`
- **THEN** all Model classes that extend `Base` (except `Acl`, `Tag`, and admin features) SHALL require zero code changes

### Requirement: MongoDB-specific admin features disabled in ferretdb mode

Profiling level querying/setting and admin commands (`runCommand`, `db.admin()`) SHALL be unavailable in ferretdb mode and return a clear "not supported" message.

#### Scenario: Profiling disabled in ferretdb mode

- **WHEN** `TMW_STORAGE_BACKEND=ferretdb`
- **AND** a request is made to get or set profiling level
- **THEN** the system SHALL return an appropriate message indicating the feature is not available in the current backend mode

#### Scenario: Admin commands disabled in ferretdb mode

- **WHEN** `TMW_STORAGE_BACKEND=ferretdb`
- **AND** a runCommand request is made
- **THEN** the system SHALL return an appropriate message indicating the feature is not available in the current backend mode
