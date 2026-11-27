# Database Audit

Production roles and their explicit permission mappings were inspected read-only. Search uses the existing published-course query and catalog option readers. It requires no schema write. Customer Service has no separate production role code. Its authorization and staff scope need a migration with data preservation, verification and recovery instructions.

For each later migration, record its purpose, affected relations and policies, transactional guarantees, compatibility checks and rollback before staging validation.
