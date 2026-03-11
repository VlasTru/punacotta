// server/db.js  –  DuckDB persistent connection + schema bootstrap
import { DuckDBInstance } from '@duckdb/node-api'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', 'data', 'puncotta.db')

let _db = null

export async function getDb() {
  if (_db) return _db
  const instance = await DuckDBInstance.create(DB_PATH)
  _db = await instance.connect()
  await bootstrap(_db)
  return _db
}

// Helper: run a query and return all rows as objects
export async function query(sql, params = []) {
  const db = await getDb()
  const reader = await db.runAndReadAll(sql, params)
  return reader.getRowObjectsJson()
}

// Helper: run a statement (INSERT / UPDATE / DELETE) – returns nothing
export async function run(sql, params = []) {
  const db = await getDb()
  await db.run(sql, params)
}

async function bootstrap(db) {
  // Enable sequences support
  await db.run(`
    CREATE SEQUENCE IF NOT EXISTS seq_user  START 1;
    CREATE SEQUENCE IF NOT EXISTS seq_product START 1;
    CREATE SEQUENCE IF NOT EXISTS seq_recipe  START 1;
    CREATE SEQUENCE IF NOT EXISTS seq_menu    START 1;
    CREATE SEQUENCE IF NOT EXISTS seq_menu_recipe START 1;
    CREATE SEQUENCE IF NOT EXISTS seq_order   START 1;
    CREATE SEQUENCE IF NOT EXISTS seq_token   START 1;
  `)

  await db.run(`
    CREATE TABLE IF NOT EXISTS "user" (
      uid              INTEGER PRIMARY KEY DEFAULT nextval('seq_user'),
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

    CREATE TABLE IF NOT EXISTS product_category (
      caid  INTEGER PRIMARY KEY,
      name  VARCHAR(50) NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS recipe_category (
      caid  INTEGER PRIMARY KEY,
      name  VARCHAR(50) NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS units (
      unid  INTEGER PRIMARY KEY,
      name  VARCHAR(50) NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS product (
      pid      INTEGER PRIMARY KEY DEFAULT nextval('seq_product'),
      name     VARCHAR(50)  NOT NULL,
      caid     INTEGER REFERENCES product_category(caid),
      unid     INTEGER REFERENCES units(unid),
      deleted  BOOLEAN NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS recipe (
      rid        INTEGER PRIMARY KEY DEFAULT nextval('seq_recipe'),
      name       VARCHAR(50)  NOT NULL,
      description VARCHAR(100),
      unid       INTEGER REFERENCES units(unid),
      price      INTEGER      NOT NULL DEFAULT 0,
      currency   VARCHAR(3)   NOT NULL DEFAULT 'AMD',
      available  BOOLEAN      NOT NULL DEFAULT true,
      caid       INTEGER REFERENCES recipe_category(caid),
      deleted    BOOLEAN      NOT NULL DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS menu (
      mid           INTEGER PRIMARY KEY DEFAULT nextval('seq_menu'),
      name          VARCHAR(50)  NOT NULL UNIQUE,
      available     BOOLEAN      NOT NULL DEFAULT false,
      delivery_fee  INTEGER      NOT NULL DEFAULT 0,
      owner_uid     INTEGER      REFERENCES "user"(uid)
    );

    CREATE TABLE IF NOT EXISTS menu_recipe (
      mereid  INTEGER PRIMARY KEY DEFAULT nextval('seq_menu_recipe'),
      mid     INTEGER NOT NULL REFERENCES menu(mid),
      rid     INTEGER NOT NULL REFERENCES recipe(rid),
      UNIQUE(mid, rid)
    );

    CREATE TABLE IF NOT EXISTS "order" (
      oid        INTEGER PRIMARY KEY DEFAULT nextval('seq_order'),
      owner_uid  INTEGER REFERENCES "user"(uid),
      mid        INTEGER REFERENCES menu(mid),
      pickup     BOOLEAN NOT NULL DEFAULT true,
      status     VARCHAR(20) NOT NULL DEFAULT 'New',
      delivery_address VARCHAR(200),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS order_item (
      oiid    INTEGER PRIMARY KEY,
      oid     INTEGER NOT NULL REFERENCES "order"(oid),
      rid     INTEGER NOT NULL REFERENCES recipe(rid),
      qty     SMALLINT NOT NULL DEFAULT 1,
      price   INTEGER  NOT NULL
    );

    CREATE TABLE IF NOT EXISTS auth_token (
      tid      INTEGER PRIMARY KEY DEFAULT nextval('seq_token'),
      uid      INTEGER NOT NULL REFERENCES "user"(uid),
      token    VARCHAR(64) NOT NULL UNIQUE,
      purpose  VARCHAR(20) NOT NULL,   -- 'verify' | 'reset'
      expires_at TIMESTAMPTZ NOT NULL,
      used     BOOLEAN NOT NULL DEFAULT false
    );
  `)

  await seedLookups(db)
}

async function seedLookups(db) {
  // Only seed if empty
  const rows = await db.runAndReadAll(`SELECT count(*) as c FROM units`)
  const count = rows.getRowObjectsJson()[0].c
  if (Number(count) > 0) return

  const unitsList = ['grams','litres','kilograms','sachets','packages','bags','cartons','pcs']
  for (let i = 0; i < unitsList.length; i++) {
    await db.run(`INSERT OR IGNORE INTO units VALUES (?, ?)`, [i+1, unitsList[i]])
  }

  const prodCats = ['vegetables','fruit','dressing','dairy','poultry','fish','nuts','liquids','meat']
  for (let i = 0; i < prodCats.length; i++) {
    await db.run(`INSERT OR IGNORE INTO product_category VALUES (?, ?)`, [i+1, prodCats[i]])
  }

  const recCats = ['cold drinks','hot drinks','alcohol','starters','main courses','side dishes','desserts','soups','snacks','appetizers']
  for (let i = 0; i < recCats.length; i++) {
    await db.run(`INSERT OR IGNORE INTO recipe_category VALUES (?, ?)`, [i+1, recCats[i]])
  }
}
