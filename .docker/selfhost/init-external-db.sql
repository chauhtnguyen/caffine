-- Run once. Connect to default DB first (-d postgres) so the DB exists before \c.
-- macOS (Homebrew): psql -d postgres -f init-external-db.sql
-- Linux (postgres role):     psql -U postgres -d postgres -f init-external-db.sql
-- Creates user caffine, database caffine, and enables pgvector (Postgres 17).

CREATE USER caffine WITH PASSWORD 'caffine';
CREATE DATABASE caffine OWNER caffine;
\c caffine
CREATE EXTENSION IF NOT EXISTS vector;
