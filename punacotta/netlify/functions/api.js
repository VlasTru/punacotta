// netlify/functions/api.js
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { randomBytes } from 'crypto'
import pg from 'pg'
import nodemailer from 'nodemailer'
import { v2 as cloudinary } from 'cloudinary'

const { Pool } = pg

// ─── DB ───────────────────────────────────────────────────────────────────────
let _pool = null
function getPool() {
  if (_pool) return _pool
  _pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
  })
  return _pool
}
async function dbq(sql, params = []) { return (await getPool().query(sql, params)).rows }
async function dbr(sql, params = []) { return getPool().query(sql, params) }

// ─── CLOUDINARY ───────────────────────────────────────────────────────────────
function initCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

async function cloudinaryUpload(dataUri, publicId) {
  initCloudinary()
  const full = await cloudinary.uploader.upload(dataUri, {
    public_id: publicId, overwrite: true,
    transformation: [{ width: 1200, height: 900, crop: 'limit', fetch_format: 'webp', quality: 'auto' }],
  })
  const thumb = await cloudinary.uploader.upload(dataUri, {
    public_id: `${publicId}_thumb`, overwrite: true,
    transformation: [{ width: 80, height: 80, crop: 'pad', background: 'white', fetch_format: 'webp', quality: 'auto' }],
  })
  return { url: full.secure_url, thumb_url: thumb.secure_url }
}

async function cloudinaryDelete(publicId) {
  initCloudinary()
  await Promise.all([
    cloudinary.uploader.destroy(publicId).catch(() => {}),
    cloudinary.uploader.destroy(`${publicId}_thumb`).catch(() => {}),
  ])
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
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return nodemailer.createTransport({ jsonTransport: true })
}
async function sendMail(to, subject, text) {
  const t = mailer()
  const info = await t.sendMail({ from: process.env.SMTP_FROM || 'hello@puncotta.com', to, subject, text })
  if (!process.env.SMTP_HOST) { try { console.log('📧', JSON.parse(info.message).text) } catch {} }
}

// ─── RECIPE SELECT ────────────────────────────────────────────────────────────
const RECIPE_SEL = `
  SELECT r.rid, r.name, r.description, r.price, r.currency, r.available,
         r.deliverable, r.image_url, r.image_thumb_url, r.cloudinary_id,
         u.name AS units, u.unid, c.name AS category, c.caid
  FROM recipe r
  LEFT JOIN units u ON u.unid=r.unid
  LEFT JOIN recipe_category c ON c.caid=r.caid`

async function attachContents(rows) {
  if (!rows.length) return rows
  const rids = rows.map(r=>r.rid)
  const contents = await dbq(`
    SELECT rp.rid, rp.pid, rp.qty,
           p.name AS product_name, u.name AS units
    FROM recipe_product rp
    JOIN product p ON p.pid=rp.pid
    LEFT JOIN units u ON u.unid=p.unid
    WHERE rp.rid=ANY($1::int[])
    ORDER BY p.name`, [rids])
  return rows.map(r=>({
    ...r,
    contents: contents
      .filter(c=>c.rid===r.rid)
      .map(c=>({ pid:c.pid, label:`${c.product_name}${c.units?', '+c.units:''}`, qty:Number(c.qty) }))
  }))
}

// ─── MENU HELPER ──────────────────────────────────────────────────────────────
async function fetchMenu(mid) {
  const [menu] = await dbq('SELECT * FROM menu WHERE mid = $1', [mid])
  if (!menu) return null
  const recipes = await dbq(`
    SELECT r.rid, r.name, r.description, r.price, r.currency,
           r.deliverable, r.image_url, r.image_thumb_url, c.name AS category
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
  let customer = null
  if (order.owner_uid) {
    const [c] = await dbq(
      'SELECT uid, first_name, last_name, email FROM "user" WHERE uid = $1', [order.owner_uid])
    customer = c || null
  }
  if (!customer && order.walkin_name) {
    customer = { first_name: order.walkin_name, last_name: '', email: null, uid: null }
  }
  return { ...order, items, customer }
}

// ─── MULTIPART PARSER ─────────────────────────────────────────────────────────
function parseMultipart(event) {
  const ct = event.headers['content-type'] || ''
  const boundary = ct.split('boundary=')[1]?.split(';')[0]
  if (!boundary) return null

  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('binary')
    : event.body

  const parts = raw.split(`--${boundary}`).slice(1, -1)
  const fields = {}

  for (const part of parts) {
    const sep = part.indexOf('\r\n\r\n')
    if (sep === -1) continue
    const header = part.slice(0, sep)
    const bodyRaw = part.slice(sep + 4).replace(/\r\n$/, '')
    const nameMatch = header.match(/name="([^"]+)"/)
    if (!nameMatch) continue
    const name = nameMatch[1]
    if (header.includes('filename=')) {
      const mimeMatch = header.match(/Content-Type:\s*([^\r\n]+)/)
      const mime = mimeMatch ? mimeMatch[1].trim() : 'image/jpeg'
      const b64 = Buffer.from(bodyRaw, 'binary').toString('base64')
      fields[name] = `data:${mime};base64,${b64}`
    } else {
      fields[name] = bodyRaw
    }
  }
  return fields
}

// ─── ROUTER ───────────────────────────────────────────────────────────────────
const TRANSITIONS = { New:'Accepted', Accepted:'Preparing', Preparing:'Done', Done:'Dispatched', Dispatched:'Delivered' }

async function route(method, segments, body, headers, event) {
  const user = getUser(headers)
  const [r0, r1, r2] = segments

  // ── AUTH ──────────────────────────────────────────────────────────────────
  if (r0 === 'auth') {
    if (r1 === 'login' && method === 'POST') {
      const { email, password } = body
      const [u] = await dbq('SELECT * FROM "user" WHERE email = $1', [email?.toLowerCase()])
      if (!u || !(await bcrypt.compare(password, u.password_hash)))
        return [401, { error: 'Invalid email or password' }]
      return [200, { token: signToken({ uid:u.uid, email:u.email, is_manufacturer:u.is_manufacturer }), user: safe(u) }]
    }
    if (r1 === 'register' && method === 'POST') {
      const { first_name, last_name, email, phone, street_address, city, zip,
              password, is_manufacturer, business_name } = body
      if (!first_name || !last_name || !email || !password) return [400, { error: 'Missing required fields' }]
      if (password.trim().length < 6) return [400, { error: 'Password must be at least 6 characters' }]
      const ex = await dbq('SELECT uid FROM "user" WHERE email = $1', [email.toLowerCase()])
      if (ex.length) return [409, { error: 'A username with this email already exists. Please, login.' }]
      const hash = await bcrypt.hash(password.trim(), 10)
      await dbr(
        `INSERT INTO "user" (first_name,last_name,email,phone,street_address,city,zip,password_hash,is_manufacturer,business_name)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [first_name, last_name, email.toLowerCase(), phone||null, street_address||null, city||null, zip||null,
         hash, !!is_manufacturer, is_manufacturer?(business_name||null):null])
      const [u] = await dbq('SELECT * FROM "user" WHERE email = $1', [email.toLowerCase()])
      const token = randomBytes(32).toString('hex')
      await dbr(`INSERT INTO auth_token (uid,token,purpose,expires_at) VALUES ($1,$2,'verify',$3)`,
        [u.uid, token, new Date(Date.now() + 3_600_000)])
      await sendMail(u.email, 'Welcome to Pun&Cotta – confirm your email',
        `Hi, ${u.first_name}\n\nConfirm:\n${BASE_URL}/verify/${token}\n\nValid 1 hour.\n\nPunacotta.`)
      return [201, { message: 'Please check your email to find a welcome message.' }]
    }
    if (r1 === 'forgot' && method === 'POST') {
      const [u] = await dbq('SELECT * FROM "user" WHERE email = $1', [body.email?.toLowerCase()])
      if (u) {
        const token = randomBytes(32).toString('hex')
        await dbr(`INSERT INTO auth_token (uid,token,purpose,expires_at) VALUES ($1,$2,'reset',$3)`,
          [u.uid, token, new Date(Date.now() + 3_600_000)])
        await sendMail(u.email, 'Pun&Cotta – reset your password',
          `Hi, ${u.first_name}\n\nReset:\n${BASE_URL}/reset/${token}\n\nValid 1 hour.\n\nPunacotta.`)
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
      return [200, { token: signToken({ uid:u.uid, email:u.email, is_manufacturer:u.is_manufacturer }), user: safe(u) }]
    }
    if (r1 === 'me' && method === 'GET') {
      if (!user) return [401, { error: 'Unauthorized' }]
      const [u] = await dbq('SELECT * FROM "user" WHERE uid=$1', [user.uid])
      return u ? [200, safe(u)] : [404, { error: 'Not found' }]
    }
  }

  // ── IMAGES ────────────────────────────────────────────────────────────────
  if (r0 === 'images') {
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]

    if (r1 === 'upload' && method === 'POST') {
      const fields = parseMultipart(event)
      if (!fields?.image) return [400, { error: 'No image provided' }]
      const rid = fields.rid || `tmp_${Date.now()}`
      const publicId = `puncotta/recipes/r_${rid}`
      if (fields.rid) {
        const [ex] = await dbq('SELECT cloudinary_id FROM recipe WHERE rid=$1', [fields.rid])
        if (ex?.cloudinary_id) await cloudinaryDelete(ex.cloudinary_id)
      }
      const { url, thumb_url } = await cloudinaryUpload(fields.image, publicId)
      return [200, { url, thumb_url, cloudinary_id: publicId }]
    }

    if (r1 === 'remove' && r2 && method === 'DELETE') {
      const [row] = await dbq('SELECT cloudinary_id FROM recipe WHERE rid=$1', [r2])
      if (row?.cloudinary_id) await cloudinaryDelete(row.cloudinary_id)
      await dbr('UPDATE recipe SET image_url=null,image_thumb_url=null,cloudinary_id=null WHERE rid=$1', [r2])
      return [200, { removed: true }]
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
      if (method === 'GET') return [200, await dbq(`
        SELECT p.pid, p.name, u.name AS units, u.unid, c.name AS category, c.caid
        FROM product p
        LEFT JOIN units u ON u.unid=p.unid
        LEFT JOIN product_category c ON c.caid=p.caid
        WHERE p.deleted=false ORDER BY p.name`)]
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
        const { ids, cascade_recipes } = body
        if (!Array.isArray(ids) || !ids.length) return [400, { error: 'ids required' }]
        // If cascade requested, soft-delete affected recipes first
        if (cascade_recipes) {
          const affected = await dbq(
            `SELECT DISTINCT rp.rid FROM recipe_product rp WHERE rp.pid=ANY($1::int[])`,
            [ids]
          )
          if (affected.length) {
            const rids = affected.map(r=>r.rid)
            for (const rid of rids) {
              const [rec] = await dbq('SELECT cloudinary_id FROM recipe WHERE rid=$1', [rid])
              if (rec?.cloudinary_id) await cloudinaryDelete(rec.cloudinary_id)
            }
            await dbr('UPDATE recipe SET deleted=true WHERE rid=ANY($1::int[])', [rids])
          }
        }
        await dbr('UPDATE product SET deleted=true WHERE pid=ANY($1::int[])', [ids])
        return [200, { deleted: ids }]
      }
    }
    // GET /products/usage?ids=1,2,3  — returns recipes that use these products
    if (r1 === 'usage' && method === 'GET') {
      const ids = (segments[2]||'').split(',').map(Number).filter(Boolean)
      if (!ids.length) return [200, {}]
      const rows = await dbq(`
        SELECT rp.pid, r.rid, r.name AS recipe_name
        FROM recipe_product rp
        JOIN recipe r ON r.rid=rp.rid
        WHERE rp.pid=ANY($1::int[]) AND r.deleted=false
        ORDER BY r.name`, [ids])
      // Group by pid
      const map = {}
      for (const row of rows) {
        if (!map[row.pid]) map[row.pid] = []
        if (!map[row.pid].find(x=>x.rid===row.rid))
          map[row.pid].push({ rid:row.rid, name:row.recipe_name })
      }
      return [200, map]
    }
  }

  // ── RECIPES ───────────────────────────────────────────────────────────────
  // Helper: replace all recipe_product rows for a recipe
  async function saveContents(rid, contents) {
    await dbr('DELETE FROM recipe_product WHERE rid=$1', [rid])
    for (const c of (contents||[])) {
      if (!c.pid) continue
      await dbr(
        `INSERT INTO recipe_product (rid,pid,qty) VALUES ($1,$2,$3)
         ON CONFLICT (rid,pid) DO UPDATE SET qty=$3`,
        [rid, c.pid, parseFloat(c.qty)||1]
      )
    }
  }

  if (r0 === 'recipes') {
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
    // PUT /recipes/:rid — full update
    if (r1 && method === 'PUT') {
      if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]
      const { name, description, unid, caid, price, currency, available,
              deliverable, image_url, image_thumb_url, cloudinary_id, contents } = body
      if (!name?.trim()) return [400, { error: 'Name required' }]
      await dbr(`UPDATE recipe SET name=$1,description=$2,unid=$3,caid=$4,price=$5,currency=$6,
                 available=$7,deliverable=$8,image_url=$9,image_thumb_url=$10,cloudinary_id=$11 WHERE rid=$12`,
        [name.trim(), description||null, unid||null, caid||null,
         Number(price)||0, currency||'AMD', available!==false, deliverable!==false,
         image_url||null, image_thumb_url||null, cloudinary_id||null, r1])
      if (Array.isArray(contents)) await saveContents(r1, contents)
      const rows = await dbq(RECIPE_SEL + ' WHERE r.rid=$1', [r1])
      return [200, (await attachContents(rows))[0]]
    }
    // PATCH /recipes/:rid — partial update
    if (r1 && method === 'PATCH') {
      if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]
      if (body.available !== undefined)
        await dbr('UPDATE recipe SET available=$1 WHERE rid=$2', [!!body.available, r1])
      if (body.deliverable !== undefined)
        await dbr('UPDATE recipe SET deliverable=$1 WHERE rid=$2', [!!body.deliverable, r1])
      const [row] = await dbq(RECIPE_SEL + ' WHERE r.rid=$1', [r1])
      return [200, row]
    }
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]
    if (method === 'GET') {
      const rows = await dbq(RECIPE_SEL + ' WHERE r.deleted=false ORDER BY r.name')
      return [200, await attachContents(rows)]
    }
    if (method === 'POST') {
      const { name, description, unid, caid, price, currency, available,
              deliverable, image_url, image_thumb_url, cloudinary_id, contents } = body
      if (!name?.trim()) return [400, { error: 'Name required' }]
      const res = await dbr(
        `INSERT INTO recipe (name,description,unid,caid,price,currency,available,deliverable,
                             image_url,image_thumb_url,cloudinary_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING rid`,
        [name.trim(), description||null, unid||null, caid||null,
         Number(price)||0, currency||'AMD', available!==false, deliverable!==false,
         image_url||null, image_thumb_url||null, cloudinary_id||null])
      const rid = res.rows[0].rid
      if (Array.isArray(contents)) await saveContents(rid, contents)
      const rows = await dbq(RECIPE_SEL + ' WHERE r.rid=$1', [rid])
      return [201, (await attachContents(rows))[0]]
    }
    if (method === 'DELETE') {
      const { ids } = body
      if (!Array.isArray(ids) || !ids.length) return [400, { error: 'ids required' }]
      for (const rid of ids) {
        const [r] = await dbq('SELECT cloudinary_id FROM recipe WHERE rid=$1', [rid])
        if (r?.cloudinary_id) await cloudinaryDelete(r.cloudinary_id)
        await dbr('DELETE FROM recipe_product WHERE rid=$1', [rid])
      }
      await dbr('UPDATE recipe SET deleted=true WHERE rid=ANY($1::int[])', [ids])
      return [200, { deleted: ids }]
    }
  }

  // ── SCHEDULE ──────────────────────────────────────────────────────────────
  if (r0 === 'schedule') {
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]
    if (method === 'GET') {
      const [row] = await dbq('SELECT schedule FROM "user" WHERE uid=$1', [user.uid])
      const stored = row?.schedule
      if (stored && typeof stored === 'object' && stored.schedule) {
        return [200, stored]
      }
      // Return sensible defaults if nothing saved yet
      return [200, {
        schedule: {
          monday:[{start:"09:00",end:"21:00"}], tuesday:[{start:"09:00",end:"21:00"}],
          wednesday:[{start:"09:00",end:"21:00"}], thursday:[{start:"09:00",end:"21:00"}],
          friday:[{start:"09:00",end:"21:00"}], saturday:[{start:"10:00",end:"18:00"}],
          sunday:[]
        },
        timezone: 'Asia/Yerevan',
        latest_order_before: '01:00'
      }]
    }
    if (method === 'PUT') {
      const { schedule, timezone, latest_order_before } = body
      await dbr(
        'UPDATE "user" SET schedule=$1 WHERE uid=$2',
        [JSON.stringify({ schedule, timezone, latest_order_before }), user.uid]
      )
      return [200, { schedule, timezone, latest_order_before }]
    }
  }

  // ── MENUS ─────────────────────────────────────────────────────────────────
  if (r0 === 'menus') {
    if (!user) return [401, { error: 'Unauthorized' }]
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
    // POST /menus/:mid/duplicate
    if (r1 && r2 === 'duplicate' && method === 'POST') {
      if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
      const src = await fetchMenu(r1)
      if (!src) return [404, { error: 'Menu not found' }]
      // Find next available copy name: "Name (1)", "Name (2)", ...
      const baseName = src.name.replace(/\s*\(\d+\)$/, '')
      const existing = await dbq(
        `SELECT name FROM menu WHERE owner_uid=$1 AND name LIKE $2`,
        [user.uid, `${baseName}%`]
      )
      let n = 1
      while (existing.find(r => r.name === `${baseName} (${n})`)) n++
      const newName = `${baseName} (${n})`
      const res = await dbr(
        'INSERT INTO menu (name,available,delivery_fee,owner_uid) VALUES ($1,false,$2,$3) RETURNING mid',
        [newName, src.delivery_fee, user.uid]
      )
      const newMid = res.rows[0].mid
      for (const r of src.recipes||[])
        await dbr('INSERT INTO menu_recipe (mid,rid) VALUES ($1,$2) ON CONFLICT DO NOTHING', [newMid, r.rid])
      return [201, await fetchMenu(newMid)]
    }
    if (r1) {
      if (method === 'GET') { const m = await fetchMenu(r1); return m ? [200, m] : [404, { error: 'Not found' }] }
      if (method === 'PATCH') {
        if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
        const { name, available, delivery_fee, hours_from, hours_until, hours_days } = body
        if (name !== undefined) await dbr('UPDATE menu SET name=$1 WHERE mid=$2', [name.trim(), r1])
        if (available !== undefined) await dbr('UPDATE menu SET available=$1 WHERE mid=$2', [!!available, r1])
        if (delivery_fee !== undefined) await dbr('UPDATE menu SET delivery_fee=$1 WHERE mid=$2', [Number(delivery_fee), r1])
        if (hours_from !== undefined) await dbr('UPDATE menu SET hours_from=$1 WHERE mid=$2', [hours_from||null, r1])
        if (hours_until !== undefined) await dbr('UPDATE menu SET hours_until=$1 WHERE mid=$2', [hours_until||null, r1])
        if (hours_days !== undefined) await dbr('UPDATE menu SET hours_days=$1 WHERE mid=$2', [hours_days||[], r1])
        return [200, await fetchMenu(r1)]
      }
    }
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

  // ── ADDRESSES (customer saved delivery addresses) ─────────────────────────
  if (r0 === 'addresses') {
    if (!user) return [401, { error: 'Unauthorized' }]
    if (method === 'GET') {
      // Return 2 most recent distinct delivery addresses from orders, plus profile address
      const recent = await dbq(`
        SELECT DISTINCT delivery_address
        FROM "order"
        WHERE owner_uid = $1
          AND delivery_address IS NOT NULL
          AND delivery_address != ''
        ORDER BY MAX(created_at) DESC
        LIMIT 2`,
        [user.uid]
      ).catch(async () => {
        // fallback without window function if needed
        return dbq(`
          SELECT delivery_address
          FROM "order"
          WHERE owner_uid = $1
            AND delivery_address IS NOT NULL
            AND delivery_address != ''
          GROUP BY delivery_address
          ORDER BY MAX(created_at) DESC
          LIMIT 2`, [user.uid])
      })

      const addresses = []
      // Most recent is index 0 — mark first as Default
      for (let i = 0; i < recent.length; i++) {
        addresses.push({
          display: recent[i].delivery_address,
          label: i === 0 ? 'Default' : ''
        })
      }
      // If no saved addresses, fall back to profile
      if (addresses.length === 0) {
        const [u] = await dbq('SELECT street_address, city, zip FROM "user" WHERE uid=$1', [user.uid])
        const profileAddr = [u?.street_address, u?.city, u?.zip].filter(Boolean).join(', ')
        if (profileAddr) addresses.push({ display: profileAddr, label: 'Default' })
      }
      return [200, addresses]
    }
  }

  // ── CUSTOMERS (search) ────────────────────────────────────────────────────
  if (r0 === 'customers') {
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]
    if (method === 'GET') {
      const q = (segments[1] || '').toLowerCase()
      if (!q || q.length < 2) return [200, []]
      const rows = await dbq(`
        SELECT uid, first_name, last_name, email, phone, street_address, city, zip
        FROM "user"
        WHERE is_manufacturer = false
          AND (
            LOWER(first_name) LIKE $1 OR
            LOWER(last_name)  LIKE $1 OR
            LOWER(email)      LIKE $1 OR
            phone             LIKE $1 OR
            LOWER(CONCAT(first_name,' ',last_name)) LIKE $1
          )
        ORDER BY first_name, last_name
        LIMIT 10`,
        [`%${q}%`]
      )
      return [200, rows]
    }
  }

  // ── ORDERS ────────────────────────────────────────────────────────────────
  if (r0 === 'orders') {
    if (!user) return [401, { error: 'Unauthorized' }]
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
    if (method === 'GET') {
      const rows = user.is_manufacturer
        ? await dbq(`SELECT o.oid FROM "order" o JOIN menu m ON m.mid=o.mid
                     WHERE m.owner_uid=$1 ORDER BY o.created_at DESC`, [user.uid])
        : await dbq('SELECT oid FROM "order" WHERE owner_uid=$1 ORDER BY created_at DESC', [user.uid])
      return [200, await Promise.all(rows.map(r => fetchOrder(r.oid)))]
    }
    if (method === 'POST') {
      const { mid, pickup, items, delivery_address, customer_uid, walkin_name, delivery_comments } = body
      if (!Array.isArray(items) || !items.length) return [400, { error: 'Order must have at least one item' }]

      // Manufacturer placing on behalf of customer
      const isManualOrder = user.is_manufacturer && (customer_uid || walkin_name)
      if (user.is_manufacturer && !isManualOrder)
        return [403, { error: 'Specify a customer or walk-in name' }]

      // For menu check: manufacturer can order from their own menu even if unavailable=false
      const [menu] = user.is_manufacturer
        ? await dbq('SELECT * FROM menu WHERE mid=$1', [mid])
        : await dbq('SELECT * FROM menu WHERE mid=$1 AND available=true', [mid])
      if (!menu) return [400, { error: 'Menu not found' }]

      for (const item of items) {
        const [mr] = await dbq('SELECT 1 FROM menu_recipe WHERE mid=$1 AND rid=$2', [mid, item.rid])
        if (!mr) return [400, { error: `Recipe ${item.rid} not in menu` }]
      }

      // Determine owner_uid — use customer account if found, else null (walk-in)
      const ownerUid = isManualOrder ? (customer_uid || null) : user.uid

      const res = await dbr(
        `INSERT INTO "order" (owner_uid, mid, pickup, delivery_address, walkin_name, delivery_comments)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING oid`,
        [ownerUid, mid, !!pickup, delivery_address||null,
         isManualOrder && !customer_uid ? (walkin_name||'Walk-in') : null,
         delivery_comments||null]
      )
      const oid = res.rows[0].oid

      for (const item of items) {
        const [recipe] = await dbq('SELECT price FROM recipe WHERE rid=$1', [item.rid])
        await dbr('INSERT INTO order_item (oid,rid,qty,price) VALUES ($1,$2,$3,$4)',
          [oid, item.rid, item.qty, recipe.price])
      }

      if (!pickup && delivery_address && ownerUid)
        await dbr('UPDATE "user" SET street_address=$1 WHERE uid=$2', [delivery_address, ownerUid])

      const full = await fetchOrder(oid)

      // Email only for registered customers
      if (ownerUid && !isManualOrder) {
        const [manuf] = await dbq('SELECT business_name FROM "user" WHERE uid=$1', [menu.owner_uid])
        const [cust]  = await dbq('SELECT * FROM "user" WHERE uid=$1', [ownerUid])
        if (cust?.email) await sendMail(cust.email,
          `Your order #${oid} is heading to the kitchen`,
          `Hi, ${cust.first_name} ${cust.last_name},\n\nYour order #${oid} is on its way to the kitchen.\n\nKind regards,\n${manuf?.business_name||'Pun&Cotta'}`)
      }

      return [201, full]
    }
  }

  // ── SUPPLIERS ─────────────────────────────────────────────────────────────
  if (r0 === 'suppliers') {
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]

    // GET /suppliers/:sid/products — products linked to this supplier
    if (r1 && r2 === 'products' && method === 'GET') {
      const rows = await dbq(`
        SELECT ps.psid, ps.pid, ps.price, ps.currency,
               p.name AS product_name, u.name AS units
        FROM product_supplier ps
        JOIN product p ON p.pid=ps.pid
        LEFT JOIN units u ON u.unid=p.unid
        WHERE ps.sid=$1 AND p.deleted=false
        ORDER BY p.name`, [r1])
      return [200, rows]
    }
    // POST /suppliers/:sid/products — link product to supplier
    if (r1 && r2 === 'products' && method === 'POST') {
      const { pid, price, currency } = body
      await dbr(`INSERT INTO product_supplier (pid,sid,price,currency) VALUES ($1,$2,$3,$4)
                 ON CONFLICT (pid,sid) DO UPDATE SET price=$3,currency=$4`,
        [pid, r1, price||null, currency||'AMD'])
      return [200, { ok:true }]
    }
    // DELETE /suppliers/:sid/products/:psid
    if (r1 && r2 === 'products' && segments[3] && method === 'DELETE') {
      await dbr('DELETE FROM product_supplier WHERE psid=$1 AND sid=$2', [segments[3], r1])
      return [200, { ok:true }]
    }

    if (r1 && method === 'GET') {
      const [s] = await dbq('SELECT * FROM supplier WHERE sid=$1 AND owner_uid=$2', [r1, user.uid])
      if (!s) return [404, { error:'Not found' }]
      return [200, s]
    }
    if (r1 && method === 'PATCH') {
      const { name,contact_fname,contact_lname,contact_title,email,phone,street_address,city,zip,schedule } = body
      await dbr(`UPDATE supplier SET name=$1,contact_fname=$2,contact_lname=$3,contact_title=$4,
                 email=$5,phone=$6,street_address=$7,city=$8,zip=$9,schedule=$10 WHERE sid=$11 AND owner_uid=$12`,
        [name,contact_fname||null,contact_lname||null,contact_title||null,
         email||null,phone||null,street_address||null,city||null,zip||null,
         schedule?JSON.stringify(schedule):null,r1,user.uid])
      const [s] = await dbq('SELECT * FROM supplier WHERE sid=$1', [r1])
      return [200, s]
    }
    if (r1 && method === 'DELETE') {
      await dbr('DELETE FROM product_supplier WHERE sid=$1', [r1])
      await dbr('DELETE FROM supplier WHERE sid=$1 AND owner_uid=$2', [r1, user.uid])
      return [200, { ok:true }]
    }
    if (method === 'GET') {
      const rows = await dbq('SELECT * FROM supplier WHERE owner_uid=$1 ORDER BY name', [user.uid])
      return [200, rows]
    }
    if (method === 'POST') {
      const { name,contact_fname,contact_lname,contact_title,email,phone,street_address,city,zip,schedule } = body
      if (!name?.trim()) return [400, { error:'Name required' }]
      const res = await dbr(`INSERT INTO supplier
        (owner_uid,name,contact_fname,contact_lname,contact_title,email,phone,street_address,city,zip,schedule)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING sid`,
        [user.uid,name.trim(),contact_fname||null,contact_lname||null,contact_title||null,
         email||null,phone||null,street_address||null,city||null,zip||null,
         schedule?JSON.stringify(schedule):null])
      const [s] = await dbq('SELECT * FROM supplier WHERE sid=$1', [res.rows[0].sid])
      return [201, s]
    }
  }

  // ── PROCUREMENT (product-supplier links + expiry) ─────────────────────────
  if (r0 === 'procurement') {
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]
    // GET /procurement — all products with their suppliers and expiry
    if (method === 'GET') {
      const products = await dbq(`
        SELECT p.pid, p.name, p.expiry_hours,
               u.name AS units, c.name AS category
        FROM product p
        LEFT JOIN units u ON u.unid=p.unid
        LEFT JOIN product_category c ON c.caid=p.caid
        WHERE p.deleted=false ORDER BY p.name`)
      const links = await dbq(`
        SELECT ps.psid, ps.pid, ps.price, ps.currency,
               s.sid, s.name AS supplier_name
        FROM product_supplier ps
        JOIN supplier s ON s.sid=ps.sid
        WHERE s.owner_uid=$1`, [user.uid])
      return [200, { products, links }]
    }
    // PATCH /procurement/:pid — update expiry_hours
    if (r1 && method === 'PATCH') {
      const { expiry_hours } = body
      await dbr('UPDATE product SET expiry_hours=$1 WHERE pid=$2', [expiry_hours||null, r1])
      return [200, { ok:true }]
    }
  }

  return [404, { error: 'Not found' }]
}

// ─── NETLIFY HANDLER ──────────────────────────────────────────────────────────
export const handler = async (event) => {
  const method = event.httpMethod

  if (method === 'OPTIONS') {
    return { statusCode: 204, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    }, body: '' }
  }

  const raw = event.path.replace('/.netlify/functions/api', '').replace('/api', '')
  const segments = raw.split('/').filter(Boolean)

  const ct = event.headers['content-type'] || ''
  let body = {}
  if (!ct.includes('multipart')) {
    try { body = event.body ? JSON.parse(event.body) : {} } catch {}
  }

  try {
    const [status, data] = await route(method, segments, body, event.headers, event)
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
      body: JSON.stringify({ error: err.message || 'Internal server error' }),
    }
  }
}
