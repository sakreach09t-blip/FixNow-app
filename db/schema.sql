-- FixNow PostgreSQL schema. Safe to run more than once.
CREATE TABLE IF NOT EXISTS services (
    id          text PRIMARY KEY,
    name        text NOT NULL,
    icon        text NOT NULL,
    short       text NOT NULL,
    long_desc   text NOT NULL,
    includes    text[] NOT NULL DEFAULT '{}',
    jobs        text[] NOT NULL DEFAULT '{}',
    sort        int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS slots (
    id          text PRIMARY KEY,
    label       text NOT NULL,
    start_hour  int NOT NULL,
    end_hour    int NOT NULL,
    sort        int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS districts (
    name        text PRIMARY KEY,
    sort        int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS technicians (
    id          text PRIMARY KEY,
    name        text NOT NULL,
    trade       text NOT NULL,
    skills      text NOT NULL,
    provides    text[] NOT NULL DEFAULT '{}',
    price       int NOT NULL CHECK (price > 0),
    status      text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'busy', 'pending-review')),
    rating      numeric(2,1) NOT NULL DEFAULT 0,
    jobs        int NOT NULL DEFAULT 0,
    years       int NOT NULL DEFAULT 0,
    areas       text[] NOT NULL DEFAULT '{}',
    languages   text[] NOT NULL DEFAULT '{}',
    bio         text NOT NULL DEFAULT '',
    photo       text NOT NULL DEFAULT 'fixnow-maskot.png',
    suspended_until timestamptz,
    deleted_at  timestamptz
);
ALTER TABLE technicians DROP CONSTRAINT IF EXISTS technicians_status_check;
ALTER TABLE technicians
    ADD CONSTRAINT technicians_status_check CHECK (status IN ('available', 'busy', 'pending-review'));
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS suspended_until timestamptz;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS technician_services (
    technician_id text NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
    service_id    text NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY (technician_id, service_id)
);

CREATE TABLE IF NOT EXISTS users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_subject  text,
    role          text NOT NULL CHECK (role IN ('customer', 'technician', 'admin')),
    name          text NOT NULL,
    email         text NOT NULL,
    phone         text NOT NULL,
    district      text,
    profile       jsonb,
    password_hash text,
    suspended_until timestamptz,
    deleted_at    timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_subject text;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (role IN ('customer', 'technician', 'admin'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_until timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS users_auth_subject_key ON users (auth_subject) WHERE auth_subject IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_key ON users (phone);

CREATE TABLE IF NOT EXISTS bookings (
    id            text PRIMARY KEY,
    user_id       uuid REFERENCES users(id) ON DELETE SET NULL,
    technician_id text NOT NULL REFERENCES technicians(id),
    service       text NOT NULL,
    date          date NOT NULL,
    slot          text NOT NULL REFERENCES slots(id),
    district      text NOT NULL,
    address       text NOT NULL,
    name          text NOT NULL,
    phone         text NOT NULL,
    email         text,
    notes         text,
    price         int NOT NULL,
    status        text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    cancelled_at  timestamptz
);
-- A technician can only hold one active booking per date and slot (race-proof double-booking guard).
CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot_key
    ON bookings (technician_id, date, slot) WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings (user_id);
CREATE INDEX IF NOT EXISTS bookings_phone_idx ON bookings (phone);

CREATE TABLE IF NOT EXISTS messages (
    id          bigserial PRIMARY KEY,
    name        text NOT NULL,
    email       text NOT NULL,
    topic       text NOT NULL,
    message     text NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);
