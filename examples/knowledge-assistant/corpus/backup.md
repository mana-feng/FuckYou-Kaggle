# Backup and restore

Use the SQLite backup API to take a consistent snapshot while the service is running. Copying only the database file can miss WAL records.

A restore drill must verify records, permissions, pending approvals and the active index version. Backups require the same access restrictions as the original database.
