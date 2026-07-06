## ADDED Requirements

### Requirement: Direct PostgreSQL access for relational modules

In ferretdb mode, ACL management, Tag management, and data action log SHALL read/write directly to PostgreSQL via SQL, bypassing FerretDB.

#### Scenario: ACL uses PostgreSQL in ferretdb mode

- **WHEN** `TMW_STORAGE_BACKEND=ferretdb`
- **AND** ACL module performs add/check/remove/update operations
- **THEN** it SHALL execute SQL queries against PostgreSQL directly

#### Scenario: Tag uses PostgreSQL in ferretdb mode

- **WHEN** `TMW_STORAGE_BACKEND=ferretdb`
- **AND** Tag module performs CRUD operations
- **THEN** it SHALL execute SQL queries against PostgreSQL directly

#### Scenario: Data action log writes to PostgreSQL in ferretdb mode

- **WHEN** `TMW_STORAGE_BACKEND=ferretdb`
- **AND** a data action log entry is created
- **THEN** it SHALL be inserted into PostgreSQL

#### Scenario: MongoDB mode keeps current behavior

- **WHEN** `TMW_STORAGE_BACKEND=mongodb`
- **THEN** all relational modules SHALL use MongoDB as before, with zero changes

### Requirement: PostgreSQL connection pool

The system SHALL manage a PostgreSQL connection pool, configured via `TMW_POSTGRES_URI` and `TMW_POSTGRES_MAX_POOL` environment variables.

#### Scenario: PgPool available check

- **WHEN** `TMW_STORAGE_BACKEND=ferretdb`
- **AND** `TMW_POSTGRES_URI` is configured
- **THEN** `PgPool.available()` SHALL return true

#### Scenario: PgPool unavailable without config

- **WHEN** `TMW_STORAGE_BACKEND=mongodb`
- **OR** `TMW_POSTGRES_URI` is not configured
- **THEN** `PgPool.available()` SHALL return false
