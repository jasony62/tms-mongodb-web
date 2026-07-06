## ADDED Requirements

### Requirement: Switch storage backend via environment variable

The system SHALL read `TMW_STORAGE_BACKEND` environment variable at startup to determine which storage backend to use. Valid values are `mongodb` (default) and `ferretdb`.

#### Scenario: Backend defaults to mongodb when not configured

- **WHEN** `TMW_STORAGE_BACKEND` is not set
- **THEN** the system SHALL operate in mongodb mode

#### Scenario: Switch to ferretdb mode

- **WHEN** `TMW_STORAGE_BACKEND=ferretdb` is set
- **THEN** the system SHALL operate in ferretdb mode

### Requirement: MongoDB mode maintains full compatibility

In mongodb mode, all current functionality SHALL work identically to pre-change behavior, including profiling and admin commands.

#### Scenario: All existing features work in mongodb mode

- **WHEN** `TMW_STORAGE_BACKEND=mongodb`
- **THEN** all existing MongoDB management features (profiling, admin commands, CRUD, ACL) SHALL be fully available

### Requirement: Detect backend mode in code

The system SHALL provide a utility function to detect the current backend mode, usable across model and controller layers.

#### Scenario: Check backend mode programmatically

- **WHEN** application code calls the mode detection function
- **THEN** it SHALL return `mongodb` or `ferretdb` matching the environment variable
