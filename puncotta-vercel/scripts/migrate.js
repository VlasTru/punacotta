// scripts/migrate.js  –  run once against your Postgres DB
// Usage: DATABASE_URL=postgres://... node scripts/migrate.js

import pg from 'pg'
import { readFileSync } from 'fs'

const { Client } = pg
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

const schema = `
-- Users
CREATE TABLE IF NOT EXISTS "user" (
  uid              SERIAL PRIMARY KEY,
  first_name       VARCHAR(50)  NOT NULL,
  last_name        VARCHAR(50)  NOT NULL,
  email            VARCHAR(100) NOT NULL UNIQUE,
  street_address   VARCHAR(100),
  city             VARCHAR(50),
  zip              VARCHAR(6),
  phone            VARCHAR(25),
  password_hash    VARCHAR(256) NOT NULL,
  is_manufacturer  BOOLEAN      NOT NULL DEFAULT false,
  business_name    VARCHAR(50),
  email_verified   BOOLEAN      NOT NULL DEFAULT false,
  registered_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Lookup tables
CREATE TABLE IF NOT EXISTS product_category (
  caid  SERIAL PRIMARY KEY,
  name  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS recipe_category (
  caid  SERIAL PRIMARY KEY,
  name  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS units (
  unid  SERIAL PRIMARY KEY,
  name  VARCHAR(50) NOT NULL UNIQUE
);

-- Products
CREATE TABLE IF NOT EXISTS product (
  pid      SERIAL PRIMARY KEY,
  name     VARCHAR(50)  NOT NULL,
  caid     INTEGER REFERENCES product_category(caid),
  unid     INTEGER REFERENCES units(unid),
  deleted  BOOLEAN NOT NULL DEFAULT false
);

-- Recipes
CREATE TABLE IF NOT EXISTS recipe (
  rid         SERIAL PRIMARY KEY,
  name        VARCHAR(50)  NOT NULL,
  description VARCHAR(100),
  unid        INTEGER REFERENCES units(unid),
  price       INTEGER      NOT NULL DEFAULT 0,
  currency    VARCHAR(3)   NOT NULL DEFAULT 'AMD',
  available   BOOLEAN      NOT NULL DEFAULT true,
  caid        INTEGER REFERENCES recipe_category(caid),
  deleted     BOOLEAN      NOT NULL DEFAULT false
);

-- Menus
CREATE TABLE IF NOT EXISTS menu (
  mid           SERIAL PRIMARY KEY,
  name          VARCHAR(50)  NOT NULL UNIQUE,
  available     BOOLEAN      NOT NULL DEFAULT false,
  delivery_fee  INTEGER      NOT NULL DEFAULT 0,
  owner_uid     INTEGER      REFERENCES "user"(uid)
);

CREATE TABLE IF NOT EXISTS menu_recipe (
  mereid  SERIAL PRIMARY KEY,
  mid     INTEGER NOT NULL REFERENCES menu(mid),
  rid     INTEGER NOT NULL REFERENCES recipe(rid),
  UNIQUE(mid, rid)
);

-- Orders
CREATE TABLE IF NOT EXISTS "order" (
  oid              SERIAL PRIMARY KEY,
  owner_uid        INTEGER REFERENCES "user"(uid),
  mid              INTEGER REFERENCES menu(mid),
  pickup           BOOLEAN NOT NULL DEFAULT true,
  status           VARCHAR(20) NOT NULL DEFAULT 'New',
  delivery_address VARCHAR(200),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_item (
  oiid    SERIAL PRIMARY KEY,
  oid     INTEGER NOT NULL REFERENCES "order"(oid),
  rid     INTEGER NOT NULL REFERENCES recipe(rid),
  qty     SMALLINT NOT NULL DEFAULT 1,
  price   INTEGER  NOT NULL
);

-- Auth tokens (email verify + password reset)
CREATE TABLE IF NOT EXISTS auth_token (
  tid        SERIAL PRIMARY KEY,
  uid        INTEGER NOT NULL REFERENCES "user"(uid),
  token      VARCHAR(64) NOT NULL UNIQUE,
  purpose    VARCHAR(10) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT false
);

-- Seed lookup data (idempotent)
INSERT INTO units (name) VALUES
  ('grams'),('litres'),('kilograms'),('sachets'),
  ('packages'),('bags'),('cartons'),('pcs')
ON CONFLICT (name) DO NOTHING;

INSERT INTO product_category (name) VALUES
  ('vegetables'),('fruit'),('dressing'),('dairy'),
  ('poultry'),('fish'),('nuts'),('liquids'),('meat')
ON CONFLICT (name) DO NOTHING;

INSERT INTO recipe_category (name) VALUES
  ('cold drinks'),('hot drinks'),('alcohol'),('starters'),
  ('main courses'),('side dishes'),('desserts'),('soups'),
  ('snacks'),('appetizers')
ON CONFLICT (name) DO NOTHING;
`

await client.connect()
console.log('🐘 Connected to Postgres')
await client.query(schema)
console.log('✅ Schema applied successfully')
await client.end()
