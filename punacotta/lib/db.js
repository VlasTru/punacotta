// lib/db.js  –  Postgres client, pooling-safe for serverless
import pg from 'pg'

const { Pool } = pg

// Reuse pool across warm invocations (Vercel keeps functions warm briefly)
let _pool = null

export function getPool() {
  if (_pool) return _pool
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })
  return _pool
}

// query: returns rows array
export async function query(sql, params = []) {
  const pool = getPool()
  const res = await pool.query(sql, params)
  return res.rows
}

// run: fire-and-forget (INSERT/UPDATE/DELETE), returns result
export async function run(sql, params = []) {
  const pool = getPool()
  return pool.query(sql, params)
}
