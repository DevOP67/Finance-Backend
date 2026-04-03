-- migrations/001_init.sql
-- Run once to set up the schema: psql $DATABASE_URL -f migrations/001_init.sql

-- ── Roles enum ────────────────────────────────────────────────────────────────
CREATE TYPE user_role   AS ENUM ('viewer', 'analyst', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'inactive');
CREATE TYPE record_type AS ENUM ('income', 'expense');

-- ── Users ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT         NOT NULL,
  email         TEXT         NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          user_role    NOT NULL DEFAULT 'viewer',
  status        user_status  NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ            -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ── Financial records ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS records (
  id          SERIAL PRIMARY KEY,
  amount      NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  type        record_type    NOT NULL,
  category    TEXT           NOT NULL,
  date        DATE           NOT NULL,
  notes       TEXT,
  created_by  INT            NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ,
  deleted_at  TIMESTAMPTZ             -- soft delete
);

CREATE INDEX IF NOT EXISTS idx_records_date     ON records (date);
CREATE INDEX IF NOT EXISTS idx_records_type     ON records (type);
CREATE INDEX IF NOT EXISTS idx_records_category ON records (category);
CREATE INDEX IF NOT EXISTS idx_records_deleted  ON records (deleted_at) WHERE deleted_at IS NULL;
