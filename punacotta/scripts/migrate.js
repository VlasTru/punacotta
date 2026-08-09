// scripts/migrate.js  –  run once against your Postgres DB
// Usage: DATABASE_URL=postgres://... node scripts/migrate.js

import pg from 'pg'
import { readFileSync } from 'fs'

const { Client } = pg
const client = new Client({
  connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
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

-- Add walkin_name and delivery_comments to order table (safe to re-run)
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS walkin_name        VARCHAR(100);
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS delivery_comments  VARCHAR(100);

-- Address book for saved customer addresses (safe to re-run)
CREATE TABLE IF NOT EXISTS address_book (
  abid       SERIAL PRIMARY KEY,
  uid        INTEGER NOT NULL REFERENCES "user"(uid),
  label      VARCHAR(100),
  display    VARCHAR(300),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recipe-product contents (items have ingredients)
CREATE TABLE IF NOT EXISTS recipe_product (
  rpid    SERIAL PRIMARY KEY,
  rid     INTEGER NOT NULL REFERENCES recipe(rid),
  pid     INTEGER NOT NULL REFERENCES product(pid),
  qty     NUMERIC(10,3) NOT NULL DEFAULT 1,
  UNIQUE(rid, pid)
);

-- Suppliers
CREATE TABLE IF NOT EXISTS supplier (
  sid              SERIAL PRIMARY KEY,
  owner_uid        INTEGER NOT NULL REFERENCES "user"(uid),
  name             VARCHAR(100) NOT NULL,
  contact_fname    VARCHAR(50),
  contact_lname    VARCHAR(50),
  contact_title    VARCHAR(50),
  email            VARCHAR(100),
  phone            VARCHAR(25),
  street_address   VARCHAR(100),
  city             VARCHAR(50),
  zip              VARCHAR(10),
  schedule         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product ↔ Supplier association (with price per unit)
CREATE TABLE IF NOT EXISTS product_supplier (
  psid         SERIAL PRIMARY KEY,
  pid          INTEGER NOT NULL REFERENCES product(pid),
  sid          INTEGER NOT NULL REFERENCES supplier(sid),
  price        NUMERIC(10,2),
  currency     VARCHAR(3) DEFAULT 'AMD',
  UNIQUE(pid, sid)
);

-- Product expiry and SKU
ALTER TABLE product ADD COLUMN IF NOT EXISTS expiry_hours INTEGER;
ALTER TABLE product ADD COLUMN IF NOT EXISTS sku VARCHAR(50);

-- Add schedule column to user table (safe to re-run)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS schedule JSONB;

-- Add availability hours columns to menu (safe to re-run)
ALTER TABLE menu ADD COLUMN IF NOT EXISTS hours_from  VARCHAR(5);
ALTER TABLE menu ADD COLUMN IF NOT EXISTS hours_until VARCHAR(5);
ALTER TABLE menu ADD COLUMN IF NOT EXISTS hours_days  TEXT[] DEFAULT '{}';

-- Add new columns to recipe if they don't exist yet (safe to re-run)
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS deliverable    BOOLEAN DEFAULT true;
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS image_url      TEXT;
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS image_thumb_url TEXT;
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS cloudinary_id  TEXT;

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
  used       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "order" ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'app';
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS delivery_street TEXT;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS delivery_city TEXT;
ALTER TABLE "order" ADD COLUMN IF NOT EXISTS delivery_zip TEXT;

-- Seed lookup data (idempotent)
INSERT INTO units (name) VALUES
  ('litres'),('kilograms'),('sachets'),
  ('packages'),('bags'),('cartons'),('pcs'),('pounds'),('portions')
ON CONFLICT (name) DO NOTHING;
DELETE FROM units WHERE name='grams';
-- Rename items using grams to kilograms
UPDATE product SET unid=(SELECT unid FROM units WHERE name='kilograms') WHERE unid=(SELECT unid FROM units WHERE name='grams');
UPDATE recipe  SET unid=(SELECT unid FROM units WHERE name='kilograms') WHERE unid=(SELECT unid FROM units WHERE name='grams');

-- Add submultiple support to recipe
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS allow_submultiples BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE recipe ADD COLUMN IF NOT EXISTS moq NUMERIC(10,3);


INSERT INTO product_category (name) VALUES
  ('vegetables'),('fruit'),('dressing'),('dairy'),
  ('poultry'),('fish'),('nuts'),('liquids'),('meat'),('grains/cereals')
ON CONFLICT (name) DO NOTHING;

INSERT INTO recipe_category (name) VALUES
  ('cold drinks'),('hot drinks'),('alcohol'),
  ('main courses'),('side dishes'),('desserts'),('soups'),
  ('appetizers')
ON CONFLICT (name) DO NOTHING;

-- Remove deprecated categories (safe to re-run)
DELETE FROM recipe_category WHERE name IN ('snacks','starters');

-- Product stock (inventory from accepted supplier orders)
CREATE TABLE IF NOT EXISTS product_stock (
  psid       SERIAL PRIMARY KEY,
  pid        INTEGER NOT NULL REFERENCES product(pid),
  owner_uid  INTEGER NOT NULL REFERENCES "user"(uid),
  qty        NUMERIC(10,3) NOT NULL DEFAULT 0,
  source     VARCHAR(30) NOT NULL DEFAULT 'supplier_order',
  source_id  INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pid, owner_uid, source, source_id)
);

-- Product forecast (pre-computed daily)
CREATE TABLE IF NOT EXISTS product_forecast (
  pfid         SERIAL PRIMARY KEY,
  pid          INTEGER NOT NULL REFERENCES product(pid),
  owner_uid    INTEGER NOT NULL REFERENCES "user"(uid),
  tg           NUMERIC(10,3),
  ts           NUMERIC(10,3),
  td           NUMERIC(10,3),
  tf           NUMERIC(10,3),
  series       JSONB,   -- array of 7 daily TG values
  period_start TIMESTAMPTZ,
  period_end   TIMESTAMPTZ,
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(pid, owner_uid)
);
  soid          SERIAL PRIMARY KEY,
  owner_uid     INTEGER NOT NULL REFERENCES "user"(uid),
  sid           INTEGER NOT NULL REFERENCES supplier(sid),
  order_id      VARCHAR(30) NOT NULL,           -- e.g. 102-DC-05
  status        VARCHAR(15) NOT NULL DEFAULT 'New',  -- New/Submitted/Cancelled/Delivered/Accepted
  delivery_term VARCHAR(50),
  delivery_fee  NUMERIC(10,2) DEFAULT 0,
  currency      VARCHAR(3)   DEFAULT 'AMD',
  etd           DATE,
  submitted_at  TIMESTAMPTZ,
  accepted_at   TIMESTAMPTZ,
  comments      TEXT,
  po_pdf_url    TEXT,
  recon_pdf_url TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS supplier_order_item (
  soiid         SERIAL PRIMARY KEY,
  soid          INTEGER NOT NULL REFERENCES supplier_order(soid) ON DELETE CASCADE,
  pid           INTEGER NOT NULL REFERENCES product(pid),
  qty_ordered   NUMERIC(10,3) NOT NULL DEFAULT 1,
  qty_actual    NUMERIC(10,3),
  unit_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency      VARCHAR(3)    DEFAULT 'AMD'
);

CREATE TABLE IF NOT EXISTS embed_settings (
  esid            SERIAL PRIMARY KEY,
  uid             INTEGER NOT NULL UNIQUE REFERENCES "user"(uid),
  enabled         BOOLEAN NOT NULL DEFAULT false,
  allow_order     BOOLEAN NOT NULL DEFAULT false,
  checkout_mode   VARCHAR(10) NOT NULL DEFAULT 'inline',
  allowed_domains TEXT[],
  api_key         VARCHAR(64) NOT NULL DEFAULT encode(gen_random_bytes(32),'hex'),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff / Employees
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_employee BOOLEAN DEFAULT false;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS employer_uid INTEGER REFERENCES "user"(uid);
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS employee_seq INTEGER;

CREATE TABLE IF NOT EXISTS role (
  rid         SERIAL PRIMARY KEY,
  owner_uid   INTEGER NOT NULL REFERENCES "user"(uid),
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(7) DEFAULT '#c8873a',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_uid, name)
);

CREATE TABLE IF NOT EXISTS skill (
  skid          SERIAL PRIMARY KEY,
  owner_uid     INTEGER NOT NULL REFERENCES "user"(uid),
  name          VARCHAR(100) NOT NULL,
  duration      NUMERIC(10,2),
  duration_unit VARCHAR(10) DEFAULT 'minutes',
  dep_type      VARCHAR(2),
  dep_skid      INTEGER,
  color         VARCHAR(7),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_uid, name)
);

CREATE TABLE IF NOT EXISTS role_skill (
  rid   INTEGER NOT NULL REFERENCES role(rid) ON DELETE CASCADE,
  skid  INTEGER NOT NULL REFERENCES skill(skid) ON DELETE CASCADE,
  PRIMARY KEY(rid, skid)
);

CREATE TABLE IF NOT EXISTS employee_role (
  uid   INTEGER NOT NULL REFERENCES "user"(uid) ON DELETE CASCADE,
  rid   INTEGER NOT NULL REFERENCES role(rid) ON DELETE CASCADE,
  PRIMARY KEY(uid, rid)
);

CREATE TABLE IF NOT EXISTS employee_skill (
  uid   INTEGER NOT NULL REFERENCES "user"(uid) ON DELETE CASCADE,
  skid  INTEGER NOT NULL REFERENCES skill(skid) ON DELETE CASCADE,
  PRIMARY KEY(uid, skid)
);

-- Alter existing tables to add new columns if missing (safe re-run)
ALTER TABLE role  ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#c8873a';
ALTER TABLE skill ADD COLUMN IF NOT EXISTS duration NUMERIC(10,2);
ALTER TABLE skill ADD COLUMN IF NOT EXISTS duration_unit VARCHAR(10) DEFAULT 'minutes';
ALTER TABLE skill ADD COLUMN IF NOT EXISTS dep_type VARCHAR(2);
ALTER TABLE skill ADD COLUMN IF NOT EXISTS dep_skid INTEGER;
ALTER TABLE skill ADD COLUMN IF NOT EXISTS color VARCHAR(7);

-- Processes (v12)
CREATE TABLE IF NOT EXISTS process (
  procid     SERIAL PRIMARY KEY,
  owner_uid  INTEGER NOT NULL REFERENCES "user"(uid),
  name       VARCHAR(200) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_uid, name)
);

CREATE TABLE IF NOT EXISTS process_skill (
  psid          SERIAL PRIMARY KEY,
  procid        INTEGER NOT NULL REFERENCES process(procid) ON DELETE CASCADE,
  skid          INTEGER NOT NULL REFERENCES skill(skid) ON DELETE CASCADE,
  seq           INTEGER NOT NULL DEFAULT 1,
  duration      NUMERIC(10,2),
  duration_unit VARCHAR(10) DEFAULT 'minutes',
  dep_type      VARCHAR(2),
  dep_psid      INTEGER REFERENCES process_skill(psid) ON DELETE SET NULL
);

ALTER TABLE process_skill ADD COLUMN IF NOT EXISTS dep_type VARCHAR(2);
ALTER TABLE process_skill ADD COLUMN IF NOT EXISTS dep_psid INTEGER;

-- Roster
CREATE TABLE IF NOT EXISTS roster (
  roid          SERIAL PRIMARY KEY,
  owner_uid     INTEGER NOT NULL REFERENCES "user"(uid),
  week_start    DATE NOT NULL,           -- Monday of the roster week
  status        VARCHAR(12) NOT NULL DEFAULT 'unpublished',
                                          -- unpublished | published | approved | unapproved
  auto_clone    BOOLEAN NOT NULL DEFAULT false,
  auto_approve  BOOLEAN NOT NULL DEFAULT false,
  cloned_from   INTEGER REFERENCES roster(roid),
  published_at  TIMESTAMPTZ,
  approved_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(owner_uid, week_start)
);

CREATE TABLE IF NOT EXISTS roster_slot (
  rsid        SERIAL PRIMARY KEY,
  roid        INTEGER NOT NULL REFERENCES roster(roid) ON DELETE CASCADE,
  uid         INTEGER NOT NULL REFERENCES "user"(uid),  -- employee
  slot_date   DATE NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL,
  finalized   BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
`

await client.connect()
console.log('🐘 Connected to Postgres')
await client.query(schema)
console.log('✅ Schema applied successfully')
await client.end()
