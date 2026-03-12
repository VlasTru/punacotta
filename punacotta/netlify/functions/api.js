// netlify/functions/api.js
// Single entry point for all API routes.
// Netlify passes the path after /.netlify/functions/api as event.path.
// We normalise it back to /api/... and route accordingly.

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import pg from 'pg'
import nodemailer from 'nodemailer'

const { Pool } = pg

// ─── DB ───────────────────────────────────────────────────────────────────────
let _pool = null
function getPool() {
  if (_pool) return _pool
  _pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
  })
  return _pool
}
async function dbq(sql, params = []) {
  const r = await getPool().query(sql, params)
  return r.rows
}
async function dbr(sql, params = []) {
  return getPool().query(sql, params)
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
const SECRET = process.env.JWT_SECRET || 'puncotta-dev-secret'
const signToken = p => jwt.sign(p, SECRET, { expiresIn: '7d' })
function getUser(headers) {
  try {
    const h = headers['authorization'] || ''
    if (!h.startsWith('Bearer ')) return null
    return jwt.verify(h.slice(7), SECRET)
  } catch { return null }
}
function safe(u) { const { password_hash, ...r } = u; return r }

// ─── MAIL ─────────────────────────────────────────────────────────────────────
const BASE_URL = process.env.URL || 'http://localhost:8888'
function mailer() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return nodemailer.createTransport({ jsonTransport: true })
}
async function sendMail(to, subject, text) {
  const t = mailer()
  const info = await t.sendMail({ from: process.env.SMTP_FROM || 'hello@puncotta.com', to, subject, text })
  if (!process.env.SMTP_HOST) {
    try { console.log('📧', JSON.parse(info.message).text) } catch {}
  }
}

// ─── MENU HELPER ──────────────────────────────────────────────────────────────
async function fetchMenu(mid) {
  const [menu] = await dbq('SELECT * FROM menu WHERE mid = $1', [mid])
  if (!menu) return null
  const recipes = await dbq(`
    SELECT r.rid, r.name, r.description, r.price, r.currency, c.name AS category
    FROM menu_recipe mr
    JOIN recipe r ON r.rid = mr.rid
    LEFT JOIN recipe_category c ON c.caid = r.caid
    WHERE mr.mid = $1 ORDER BY c.name, r.name`, [mid])
  return { ...menu, recipes }
}

// ─── ORDER HELPER ─────────────────────────────────────────────────────────────
async function fetchOrder(oid) {
  const [order] = await dbq('SELECT * FROM "order" WHERE oid = $1', [oid])
  if (!order) return null
  const items = await dbq(`
    SELECT oi.oiid, oi.qty, oi.price, r.name, r.rid
    FROM order_item oi JOIN recipe r ON r.rid = oi.rid
    WHERE oi.oid = $1`, [oid])
  const [customer] = await dbq(
    'SELECT uid, first_name, last_name, email FROM "user" WHERE uid = $1',
    [order.owner_uid])
  return { ...order, items, customer }
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────
const TRANSITIONS = {
  New: 'Accepted', Accepted: 'Preparing', Preparing: 'Done',
  Done: 'Dispatched', Dispatched: 'Delivered'
}

async function route(method, segments, body, headers) {
  const user = getUser(headers)

  // segments = path split by '/', e.g. ['auth','login'] or ['menus','5','recipes']
  const [r0, r1, r2] = segments

  // ── AUTH ──────────────────────────────────────────────────────────────────
  if (r0 === 'auth') {
    if (r1 === 'login' && method === 'POST') {
      const { email, password } = body
      const [u] = await dbq('SELECT * FROM "user" WHERE email = $1', [email?.toLowerCase()])
      if (!u || !(await bcrypt.compare(password, u.password_hash)))
        return [401, { error: 'Invalid email or password' }]
      return [200, { token: signToken({ uid: u.uid, email: u.email, is_manufacturer: u.is_manufacturer }), user: safe(u) }]
    }

    if (r1 === 'register' && method === 'POST') {
      const { first_name, last_name, email, phone, street_address, city, zip,
              password, is_manufacturer, business_name } = body
      if (!first_name || !last_name || !email || !password)
        return [400, { error: 'Missing required fields' }]
      if (password.trim().length < 6)
        return [400, { error: 'Password must be at least 6 characters' }]
      const ex = await dbq('SELECT uid FROM "user" WHERE email = $1', [email.toLowerCase()])
      if (ex.length) return [409, { error: 'A username with this email already exists. Please, login.' }]
      const hash = await bcrypt.hash(password.trim(), 10)
      await dbr(
        `INSERT INTO "user" (first_name,last_name,email,phone,street_address,city,zip,
                             password_hash,is_manufacturer,business_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [first_name, last_name, email.toLowerCase(), phone||null,
         street_address||null, city||null, zip||null,
         hash, !!is_manufacturer, is_manufacturer?(business_name||null):null])
      const [u] = await dbq('SELECT * FROM "user" WHERE email = $1', [email.toLowerCase()])
      const token = randomBytes(32).toString('hex')
      await dbr(`INSERT INTO auth_token (uid,token,purpose,expires_at) VALUES ($1,$2,'verify',$3)`,
        [u.uid, token, new Date(Date.now() + 3_600_000)])
      await sendMail(u.email, 'Welcome to Pun&Cotta – confirm your email',
        `Hi, ${u.first_name}\n\nConfirm your email:\n${BASE_URL}/verify/${token}\n\nValid 1 hour.\n\nPunacotta.`)
      return [201, { message: 'Please check your email to find a welcome message.' }]
    }

    if (r1 === 'forgot' && method === 'POST') {
      const [u] = await dbq('SELECT * FROM "user" WHERE email = $1', [body.email?.toLowerCase()])
      if (u) {
        const token = randomBytes(32).toString('hex')
        await dbr(`INSERT INTO auth_token (uid,token,purpose,expires_at) VALUES ($1,$2,'reset',$3)`,
          [u.uid, token, new Date(Date.now() + 3_600_000)])
        await sendMail(u.email, 'Pun&Cotta – reset your password',
          `Hi, ${u.first_name}\n\nReset your password:\n${BASE_URL}/reset/${token}\n\nValid 1 hour.\n\nPunacotta.`)
      }
      return [200, { message: 'If that email exists, a reset link has been sent.' }]
    }

    if (r1 === 'reset' && method === 'POST') {
      const { token, password } = body
      if (!password || password.trim().length < 6) return [400, { error: 'Password must be at least 6 characters' }]
      const [row] = await dbq(
        `SELECT * FROM auth_token WHERE token=$1 AND purpose='reset' AND used=false AND expires_at>now()`, [token])
      if (!row) return [400, { error: 'Invalid or expired link' }]
      await dbr('UPDATE "user" SET password_hash=$1 WHERE uid=$2', [await bcrypt.hash(password.trim(), 10), row.uid])
      await dbr('UPDATE auth_token SET used=true WHERE tid=$1', [row.tid])
      return [200, { message: 'Password updated. You can now log in.' }]
    }

    if (r1 === 'verify' && method === 'POST') {
      const [row] = await dbq(
        `SELECT * FROM auth_token WHERE token=$1 AND purpose='verify' AND used=false AND expires_at>now()`, [body.token])
      if (!row) return [400, { error: 'Invalid or expired link' }]
      await dbr('UPDATE "user" SET email_verified=true WHERE uid=$1', [row.uid])
      await dbr('UPDATE auth_token SET used=true WHERE tid=$1', [row.tid])
      const [u] = await dbq('SELECT * FROM "user" WHERE uid=$1', [row.uid])
      return [200, { token: signToken({ uid: u.uid, email: u.email, is_manufacturer: u.is_manufacturer }), user: safe(u) }]
    }

    if (r1 === 'me' && method === 'GET') {
      if (!user) return [401, { error: 'Unauthorized' }]
      const [u] = await dbq('SELECT * FROM "user" WHERE uid=$1', [user.uid])
      return u ? [200, safe(u)] : [404, { error: 'Not found' }]
    }
  }

  // ── PRODUCTS ──────────────────────────────────────────────────────────────
  if (r0 === 'products') {
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]

    if (r1 === 'lookups' && method === 'GET') {
      const [units, categories] = await Promise.all([
        dbq('SELECT * FROM units ORDER BY name'),
        dbq('SELECT * FROM product_category ORDER BY name'),
      ])
      return [200, { units, categories }]
    }

    if (!r1 || r1 === '') {
      if (method === 'GET') {
        return [200, await dbq(`
          SELECT p.pid, p.name, u.name AS units, u.unid, c.name AS category, c.caid
          FROM product p
          LEFT JOIN units u ON u.unid=p.unid
          LEFT JOIN product_category c ON c.caid=p.caid
          WHERE p.deleted=false ORDER BY p.name`)]
      }
      if (method === 'POST') {
        const { name, unid, caid } = body
        if (!name?.trim()) return [400, { error: 'Name required' }]
        const r = await dbr('INSERT INTO product (name,unid,caid) VALUES ($1,$2,$3) RETURNING pid',
          [name.trim(), unid||null, caid||null])
        const [row] = await dbq(`
          SELECT p.pid, p.name, u.name AS units, u.unid, c.name AS category, c.caid
          FROM product p LEFT JOIN units u ON u.unid=p.unid
          LEFT JOIN product_category c ON c.caid=p.caid WHERE p.pid=$1`, [r.rows[0].pid])
        return [201, row]
      }
      if (method === 'DELETE') {
        const { ids } = body
        if (!Array.isArray(ids) || !ids.length) return [400, { error: 'ids required' }]
        await dbr('UPDATE product SET deleted=true WHERE pid=ANY($1::int[])', [ids])
        return [200, { deleted: ids }]
      }
    }
  }

  // ── RECIPES ───────────────────────────────────────────────────────────────
  if (r0 === 'recipes') {
    const RECIPE_SEL = `
      SELECT r.rid, r.name, r.description, r.price, r.currency, r.available,
             u.name AS units, u.unid, c.name AS category, c.caid
      FROM recipe r
      LEFT JOIN units u ON u.unid=r.unid
      LEFT JOIN recipe_category c ON c.caid=r.caid`

    if (r1 === 'available' && method === 'GET') {
      return [200, await dbq(RECIPE_SEL + ' WHERE r.deleted=false AND r.available=true ORDER BY r.name')]
    }

    if (r1 === 'lookups' && method === 'GET') {
      if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]
      const [units, categories] = await Promise.all([
        dbq('SELECT * FROM units ORDER BY name'),
        dbq('SELECT * FROM recipe_category ORDER BY name'),
      ])
      return [200, { units, categories }]
    }

    // PATCH /recipes/:rid
    if (r1 && method === 'PATCH') {
      if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]
      if (body.available !== undefined)
        await dbr('UPDATE recipe SET available=$1 WHERE rid=$2', [!!body.available, r1])
      const [row] = await dbq(RECIPE_SEL + ' WHERE r.rid=$1', [r1])
      return [200, row]
    }

    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]

    if (method === 'GET')
      return [200, await dbq(RECIPE_SEL + ' WHERE r.deleted=false ORDER BY r.name')]

    if (method === 'POST') {
      const { name, description, unid, caid, price, currency, available } = body
      if (!name?.trim()) return [400, { error: 'Name required' }]
      const res = await dbr(
        `INSERT INTO recipe (name,description,unid,caid,price,currency,available)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING rid`,
        [name.trim(), description||null, unid||null, caid||null,
         Number(price)||0, currency||'AMD', available!==false])
      const [row] = await dbq(RECIPE_SEL + ' WHERE r.rid=$1', [res.rows[0].rid])
      return [201, row]
    }

    if (method === 'DELETE') {
      const { ids } = body
      if (!Array.isArray(ids) || !ids.length) return [400, { error: 'ids required' }]
      await dbr('UPDATE recipe SET deleted=true WHERE rid=ANY($1::int[])', [ids])
      return [200, { deleted: ids }]
    }
  }

  // ── MENUS ─────────────────────────────────────────────────────────────────
  if (r0 === 'menus') {
    if (!user) return [401, { error: 'Unauthorized' }]

    // /menus/:mid/recipes
    if (r1 && r2 === 'recipes') {
      if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
      if (method === 'POST') {
        for (const rid of body.recipe_ids||[])
          await dbr('INSERT INTO menu_recipe (mid,rid) VALUES ($1,$2) ON CONFLICT DO NOTHING', [r1, rid])
        return [200, await fetchMenu(r1)]
      }
      if (method === 'DELETE') {
        for (const rid of body.recipe_ids||[])
          await dbr('DELETE FROM menu_recipe WHERE mid=$1 AND rid=$2', [r1, rid])
        return [200, await fetchMenu(r1)]
      }
    }

    // /menus/:mid
    if (r1) {
      if (method === 'GET') {
        const m = await fetchMenu(r1)
        return m ? [200, m] : [404, { error: 'Not found' }]
      }
      if (method === 'PATCH') {
        if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
        const { name, available, delivery_fee } = body
        if (name !== undefined) await dbr('UPDATE menu SET name=$1 WHERE mid=$2', [name.trim(), r1])
        if (available !== undefined) await dbr('UPDATE menu SET available=$1 WHERE mid=$2', [!!available, r1])
        if (delivery_fee !== undefined) await dbr('UPDATE menu SET delivery_fee=$1 WHERE mid=$2', [Number(delivery_fee), r1])
        return [200, await fetchMenu(r1)]
      }
    }

    // /menus
    if (method === 'GET') {
      const rows = user.is_manufacturer
        ? await dbq('SELECT mid FROM menu WHERE owner_uid=$1 ORDER BY mid', [user.uid])
        : await dbq('SELECT mid FROM menu WHERE available=true ORDER BY mid')
      return [200, await Promise.all(rows.map(r => fetchMenu(r.mid)))]
    }

    if (method === 'POST') {
      if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
      const { name, available, delivery_fee, recipe_ids } = body
      if (!name?.trim()) return [400, { error: 'Name required' }]
      const res = await dbr(
        'INSERT INTO menu (name,available,delivery_fee,owner_uid) VALUES ($1,$2,$3,$4) RETURNING mid',
        [name.trim(), !!available, Number(delivery_fee)||0, user.uid])
      const mid = res.rows[0].mid
      for (const rid of recipe_ids||[])
        await dbr('INSERT INTO menu_recipe (mid,rid) VALUES ($1,$2) ON CONFLICT DO NOTHING', [mid, rid])
      return [201, await fetchMenu(mid)]
    }
  }

  // ── ORDERS ────────────────────────────────────────────────────────────────
  if (r0 === 'orders') {
    if (!user) return [401, { error: 'Unauthorized' }]

    // /orders/:oid/:action
    if (r1 && r2) {
      if (r2 === 'advance') {
        if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
        const [o] = await dbq('SELECT * FROM "order" WHERE oid=$1', [r1])
        if (!o) return [404, { error: 'Not found' }]
        const next = TRANSITIONS[o.status]
        if (!next) return [400, { error: 'Cannot advance from this status' }]
        await dbr('UPDATE "order" SET status=$1 WHERE oid=$2', [next, r1])
        return [200, await fetchOrder(r1)]
      }
      if (r2 === 'decline') {
        if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
        const [o] = await dbq('SELECT * FROM "order" WHERE oid=$1', [r1])
        if (!o) return [404, { error: 'Not found' }]
        if (['Declined','Delivered'].includes(o.status)) return [400, { error: 'Cannot decline' }]
        await dbr("UPDATE \"order\" SET status='Declined' WHERE oid=$1", [r1])
        return [200, await fetchOrder(r1)]
      }
      if (r2 === 'cancel') {
        const [o] = await dbq('SELECT * FROM "order" WHERE oid=$1 AND owner_uid=$2', [r1, user.uid])
        if (!o) return [404, { error: 'Not found' }]
        if (['Declined','Delivered'].includes(o.status)) return [400, { error: 'Cannot cancel' }]
        await dbr("UPDATE \"order\" SET status='Declined' WHERE oid=$1", [r1])
        return [200, await fetchOrder(r1)]
      }
      if (r2 === 'confirm-delivery') {
        const [o] = await dbq('SELECT * FROM "order" WHERE oid=$1 AND owner_uid=$2', [r1, user.uid])
        if (!o) return [404, { error: 'Not found' }]
        if (!['Done','Dispatched'].includes(o.status)) return [400, { error: 'Cannot confirm' }]
        await dbr("UPDATE \"order\" SET status='Delivered' WHERE oid=$1", [r1])
        return [200, await fetchOrder(r1)]
      }
    }

    // /orders
    if (method === 'GET') {
      const rows = user.is_manufacturer
        ? await dbq(`SELECT o.oid FROM "order" o JOIN menu m ON m.mid=o.mid
                     WHERE m.owner_uid=$1 ORDER BY o.created_at DESC`, [user.uid])
        : await dbq('SELECT oid FROM "order" WHERE owner_uid=$1 ORDER BY created_at DESC', [user.uid])
      return [200, await Promise.all(rows.map(r => fetchOrder(r.oid)))]
    }

    if (method === 'POST') {
      if (user.is_manufacturer) return [403, { error: 'Manufacturers cannot place orders' }]
      const { mid, pickup, items, delivery_address } = body
      if (!Array.isArray(items) || !items.length) return [400, { error: 'Order must have at least one item' }]
      const [menu] = await dbq('SELECT * FROM menu WHERE mid=$1 AND available=true', [mid])
      if (!menu) return [400, { error: 'Menu not available' }]
      for (const item of items) {
        const [mr] = await dbq('SELECT 1 FROM menu_recipe WHERE mid=$1 AND rid=$2', [mid, item.rid])
        if (!mr) return [400, { error: `Recipe ${item.rid} not in menu` }]
      }
      const res = await dbr(
        `INSERT INTO "order" (owner_uid,mid,pickup,delivery_address) VALUES ($1,$2,$3,$4) RETURNING oid`,
        [user.uid, mid, !!pickup, delivery_address||null])
      const oid = res.rows[0].oid
      for (const item of items) {
        const [recipe] = await dbq('SELECT price FROM recipe WHERE rid=$1', [item.rid])
        await dbr('INSERT INTO order_item (oid,rid,qty,price) VALUES ($1,$2,$3,$4)',
          [oid, item.rid, item.qty, recipe.price])
      }
      if (!pickup && delivery_address)
        await dbr('UPDATE "user" SET street_address=$1 WHERE uid=$2', [delivery_address, user.uid])
      const full = await fetchOrder(oid)
      const [manuf] = await dbq('SELECT business_name FROM "user" WHERE uid=$1', [menu.owner_uid])
      const [cust]  = await dbq('SELECT * FROM "user" WHERE uid=$1', [user.uid])
      await sendMail(cust.email,
        `Your order #${oid} is heading to the kitchen`,
        `Hi, ${cust.first_name} ${cust.last_name},\n\nYour order #${oid} is on its way to the kitchen.\n\nKind regards,\n${manuf?.business_name||'Pun&Cotta'}`)
      return [201, full]
    }
  }

  return [404, { error: 'Not found' }]
}

// ─── NETLIFY HANDLER ──────────────────────────────────────────────────────────
export const handler = async (event) => {
  const method = event.httpMethod

  // Parse path: /.netlify/functions/api/auth/login → ['auth','login']
  const raw = event.path.replace('/.netlify/functions/api', '').replace('/api', '')
  const segments = raw.split('/').filter(Boolean)

  let body = {}
  try { body = event.body ? JSON.parse(event.body) : {} } catch {}

  try {
    const [status, data] = await route(method, segments, body, event.headers)
    return {
      statusCode: status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data),
    }
  } catch (err) {
    console.error(err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
