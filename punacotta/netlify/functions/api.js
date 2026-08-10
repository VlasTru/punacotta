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
const BASE_URL = process.env.URL || 'https://punacotta.netlify.app'

async function sendMail(to, subject, text, html) {
  // Option 1: Resend API — set RESEND_API_KEY in Netlify environment variables
  // Sign up free at resend.com, create an API key, add it to Netlify env vars.
  // Without a verified domain, emails can only be sent to your own Resend account email.
  // To send to any address, verify your domain at resend.com/domains.
  if (process.env.RESEND_API_KEY) {
    const from = process.env.SMTP_FROM || 'Pun&Cotta <onboarding@resend.dev>'
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        html: html || text.replace(/\n/g, '<br>'),
      }),
    })
    const data = await res.json().catch(()=>({}))
    if (!res.ok) throw new Error(`Email send failed: ${data.message || res.status}`)
    console.log(`📧 Sent via Resend to ${to}: ${data.id}`)
    return
  }

  // Option 2: SMTP — set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in Netlify env vars
  // Works with Gmail app passwords: SMTP_HOST=smtp.gmail.com SMTP_PORT=587
  if (process.env.SMTP_HOST) {
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to, subject, text, html: html || text.replace(/\n/g, '<br>'),
    })
    console.log(`📧 Sent via SMTP to ${to}`)
    return
  }

  // No mail config — log the link so you can still use it from Netlify function logs
  console.warn(`📧 [NO MAIL CONFIG] To: ${to} | Subject: ${subject}\n${text}`)
}

function mailHtml(title, body, cta_url, cta_label) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:500px;margin:40px auto;color:#2c1810">
  <h2 style="font-family:Georgia,serif;color:#c8873a">${title}</h2>
  <p style="line-height:1.6;color:#8b7355">${body}</p>
  ${cta_url ? `<a href="${cta_url}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#c8873a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">${cta_label}</a>` : ''}
  <p style="font-size:12px;color:#bbb;margin-top:32px">Pun&amp;Cotta · If you didn't request this, ignore this email.</p>
  </body></html>`
}

// ─── RECIPE SELECT ────────────────────────────────────────────────────────────
const RECIPE_SEL = `
  SELECT r.rid, r.name, r.description, r.price, r.currency, r.available,
         r.deliverable, r.image_url, r.image_thumb_url, r.cloudinary_id,
         r.allow_submultiples, r.moq,
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
           r.deliverable, r.image_url, r.image_thumb_url,
           r.allow_submultiples, r.moq,
           u.name AS units, u.unid,
           c.name AS category
    FROM menu_recipe mr
    JOIN recipe r ON r.rid = mr.rid
    LEFT JOIN recipe_category c ON c.caid = r.caid
    LEFT JOIN units u ON u.unid = r.unid
    WHERE mr.mid = $1 ORDER BY c.name, r.name`, [mid])
  return { ...menu, recipes }
}

// ─── ORDER HELPER ─────────────────────────────────────────────────────────────
async function fetchOrder(oid) {
  const [order] = await dbq('SELECT * FROM "order" WHERE oid = $1', [oid])
  if (!order) return null
  const items = await dbq(`
    SELECT oi.oiid, oi.qty, oi.price, r.name, r.rid, r.deliverable
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
  const allNonDeliverable = items.length > 0 && items.every(i => i.deliverable === false)
  const doneIsTerminal = order.pickup || allNonDeliverable
  return { ...order, items, customer, allNonDeliverable: doneIsTerminal }
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
      // Check email verification
      if (!u.email_verified) {
        // Check if a verify token is still valid (i.e. sent within the last hour)
        const [recent] = await dbq(
          `SELECT tid FROM auth_token WHERE uid=$1 AND purpose='verify' AND used=false
           AND expires_at > NOW() ORDER BY expires_at DESC LIMIT 1`, [u.uid])
        if (recent) {
          return [403, { error: 'unverified_recent', message: 'Please verify your email. A message has been sent earlier for you to confirm registration.' }]
        }
        return [403, { error: 'unverified_expired', message: 'Your verification link has expired. Please register again.' }]
      }
      return [200, { token: signToken({ uid:u.uid, email:u.email, is_manufacturer:u.is_manufacturer }), user: safe(u) }]
    }
    if (r1 === 'register' && method === 'POST') {
      const { first_name, last_name, email, phone, street_address, city, zip,
              password, is_manufacturer, business_name } = body
      if (!first_name || !last_name || !email || !password) return [400, { error: 'Missing required fields' }]
      if (password.trim().length < 6) return [400, { error: 'Password must be at least 6 characters' }]
      const [ex] = await dbq('SELECT uid, email_verified FROM "user" WHERE email = $1', [email.toLowerCase()])
      if (ex) {
        if (ex.email_verified) return [409, { error: 'A username with this email already exists. Please, login.' }]
        // Unverified — check if a recent token is still valid (not yet expired)
        const [recent] = await dbq(
          `SELECT tid FROM auth_token WHERE uid=$1 AND purpose='verify' AND used=false
           AND expires_at > NOW()`, [ex.uid])
        if (recent) return [409, { error: 'A verification email was recently sent to this address. Please check your inbox.' }]
        // Token expired — delete old user and allow re-registration
        await dbr('DELETE FROM auth_token WHERE uid=$1', [ex.uid])
        await dbr('DELETE FROM "user" WHERE uid=$1', [ex.uid])
      }
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
      await sendMail(
        u.email,
        'Welcome to Pun&Cotta – confirm your email',
        `Hi ${u.first_name},\n\nPlease confirm your email:\n${BASE_URL}/#verify/${token}\n\nThis link expires in 1 hour.\n\nPun&Cotta`,
        mailHtml(
          'Welcome to Pun&Cotta 🎉',
          `Hi ${u.first_name}, thanks for signing up! Please confirm your email address to get started.`,
          `${BASE_URL}/#verify/${token}`,
          'Confirm my email'
        )
      )
      return [201, { message: 'Please check your email to find a welcome message.' }]
    }
    if (r1 === 'forgot' && method === 'POST') {
      const [u] = await dbq('SELECT * FROM "user" WHERE email = $1', [body.email?.toLowerCase()])
      if (u) {
        const token = randomBytes(32).toString('hex')
        await dbr(`INSERT INTO auth_token (uid,token,purpose,expires_at) VALUES ($1,$2,'reset',$3)`,
          [u.uid, token, new Date(Date.now() + 3_600_000)])
        await sendMail(
          u.email,
          'Pun&Cotta – reset your password',
          `Hi ${u.first_name},\n\nReset your password:\n${BASE_URL}/#reset/${token}\n\nThis link expires in 1 hour.\n\nPun&Cotta`,
          mailHtml(
            'Reset your password',
            `Hi ${u.first_name}, we received a request to reset your Pun&amp;Cotta password. Click the button below — the link is valid for 1 hour.`,
            `${BASE_URL}/#reset/${token}`,
            'Reset my password'
          )
        )
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
        SELECT p.pid, p.name, p.sku, p.expiry_hours, u.name AS units, u.unid, c.name AS category, c.caid
        FROM product p
        LEFT JOIN units u ON u.unid=p.unid
        LEFT JOIN product_category c ON c.caid=p.caid
        WHERE p.deleted=false ORDER BY p.name`)]
      if (method === 'POST') {
        const { name, sku, unid, caid } = body
        if (!name?.trim()) return [400, { error: 'Name required' }]
        const r = await dbr('INSERT INTO product (name,sku,unid,caid) VALUES ($1,$2,$3,$4) RETURNING pid',
          [name.trim(), sku?.trim()||null, unid||null, caid||null])
        const [row] = await dbq(`
          SELECT p.pid, p.name, p.sku, p.expiry_hours, u.name AS units, u.unid, c.name AS category, c.caid
          FROM product p LEFT JOIN units u ON u.unid=p.unid
          LEFT JOIN product_category c ON c.caid=p.caid WHERE p.pid=$1`, [r.rows[0].pid])
        return [201, row]
      }
      if (method === 'DELETE') {
        const { ids, cascade_recipes } = body
        if (!Array.isArray(ids) || !ids.length) return [400, { error: 'ids required' }]
        if (cascade_recipes) {
          const affected = await dbq(
            `SELECT DISTINCT rp.rid FROM recipe_product rp WHERE rp.pid=ANY($1::int[])`, [ids])
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
    // PATCH /products/:pid — edit name/sku/units/category
    if (r1 && r1 !== 'lookups' && r1 !== 'usage' && method === 'PATCH') {
      const { name, sku, unid, caid } = body
      if (name !== undefined && !name?.trim()) return [400, { error: 'Name required' }]
      if (name  !== undefined) await dbr('UPDATE product SET name=$1 WHERE pid=$2',  [name.trim(), r1])
      if (sku   !== undefined) await dbr('UPDATE product SET sku=$1 WHERE pid=$2',   [sku?.trim()||null, r1])
      if (unid  !== undefined) await dbr('UPDATE product SET unid=$1 WHERE pid=$2',  [unid||null, r1])
      if (caid  !== undefined) await dbr('UPDATE product SET caid=$1 WHERE pid=$2',  [caid||null, r1])
      const [row] = await dbq(`
        SELECT p.pid, p.name, p.sku, p.expiry_hours, u.name AS units, u.unid, c.name AS category, c.caid
        FROM product p LEFT JOIN units u ON u.unid=p.unid
        LEFT JOIN product_category c ON c.caid=p.caid WHERE p.pid=$1`, [r1])
      return [200, row]
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
              deliverable, image_url, image_thumb_url, cloudinary_id,
              allow_submultiples, moq, contents } = body
      if (!name?.trim()) return [400, { error: 'Name required' }]
      await dbr(`UPDATE recipe SET name=$1,description=$2,unid=$3,caid=$4,price=$5,currency=$6,
                 available=$7,deliverable=$8,image_url=$9,image_thumb_url=$10,cloudinary_id=$11,
                 allow_submultiples=$12,moq=$13 WHERE rid=$14`,
        [name.trim(), description||null, unid||null, caid||null,
         Number(price)||0, currency||'AMD', available!==false, deliverable!==false,
         image_url||null, image_thumb_url||null, cloudinary_id||null,
         !!allow_submultiples, moq?Number(moq):null, r1])
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
              deliverable, image_url, image_thumb_url, cloudinary_id,
              allow_submultiples, moq, contents } = body
      if (!name?.trim()) return [400, { error: 'Name required' }]
      const res = await dbr(
        `INSERT INTO recipe (name,description,unid,caid,price,currency,available,deliverable,
                             image_url,image_thumb_url,cloudinary_id,allow_submultiples,moq)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING rid`,
        [name.trim(), description||null, unid||null, caid||null,
         Number(price)||0, currency||'AMD', available!==false, deliverable!==false,
         image_url||null, image_thumb_url||null, cloudinary_id||null,
         !!allow_submultiples, moq?Number(moq):null])
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
      if (method === 'DELETE') {
        if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
        const [m] = await dbq('SELECT mid FROM menu WHERE mid=$1 AND owner_uid=$2', [r1, user.uid])
        if (!m) return [404, { error: 'Menu not found' }]
        await dbr('DELETE FROM menu_recipe WHERE mid=$1', [r1])
        await dbr('DELETE FROM menu WHERE mid=$1', [r1])
        return [200, { deleted: Number(r1) }]
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
      // PATCH /orders/:oid/items — restaurant edits item quantities (Accepted status)
      if (r2 === 'items' && method === 'PATCH') {
        if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
        const [o] = await dbq('SELECT * FROM "order" WHERE oid=$1', [r1])
        if (!o) return [404, { error: 'Not found' }]
        if (o.status !== 'Accepted') return [400, { error: 'Only Accepted orders can be edited' }]
        const { items } = body // [{oiid, qty, price}]
        for (const it of (items||[])) {
          await dbr('UPDATE order_item SET qty=$1 WHERE oiid=$2 AND oid=$3',
            [Number(it.qty), it.oiid, r1])
        }
        return [200, await fetchOrder(r1)]
      }
      if (r2 === 'advance') {
        if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
        const [o] = await dbq('SELECT * FROM "order" WHERE oid=$1', [r1])
        if (!o) return [404, { error: 'Not found' }]
        // Done is terminal for: pickup orders OR orders where all items are non-deliverable
        const items = await dbq(`
          SELECT r.deliverable FROM order_item oi
          JOIN recipe r ON r.rid=oi.rid WHERE oi.oid=$1`, [r1])
        const allNonDeliverable = items.length > 0 && items.every(i => i.deliverable === false)
        const doneIsTerminal = o.pickup || allNonDeliverable
        const transitions = doneIsTerminal
          ? { New:'Accepted', Accepted:'Preparing', Preparing:'Done' }
          : { New:'Accepted', Accepted:'Preparing', Preparing:'Done', Done:'Dispatched', Dispatched:'Delivered' }
        const next = transitions[o.status]
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

  // ── PROCUREMENT (supplier orders) ────────────────────────────────────────
  if (r0 === 'procurement') {
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]

    // ── Helper: fetch full supplier order ──────────────────────────────────
    async function fetchSO(soid) {
      const [o] = await dbq('SELECT so.*, s.name AS supplier_name, s.contact_fname, s.contact_lname, s.email AS supplier_email, s.phone AS supplier_phone, s.street_address AS supplier_street, s.city AS supplier_city, s.zip AS supplier_zip, s.schedule AS supplier_schedule FROM supplier_order so JOIN supplier s ON s.sid=so.sid WHERE so.soid=$1', [soid])
      if (!o) return null
      const items = await dbq(`SELECT soi.*, p.name AS product_name, p.sku FROM supplier_order_item soi JOIN product p ON p.pid=soi.pid WHERE soi.soid=$1 ORDER BY soi.soiid`, [soid])
      return { ...o, items }
    }

    // ── Helper: generate order_id ──────────────────────────────────────────
    async function generateOrderId(sid, uid, mm) {
      const supplier = (await dbq('SELECT name, sid, created_at FROM supplier WHERE sid=$1', [sid]))[0]
      if (!supplier) throw new Error('Supplier not found')

      // Get initials for this supplier
      const words = supplier.name.trim().split(/\s+/)
      let initials = words.length === 1
        ? supplier.name.slice(0, 2).toUpperCase()
        : (words[0][0] + words[1][0]).toUpperCase()

      // Check for collision with same initials among this user's suppliers
      const allSuppliers = await dbq('SELECT sid, name, created_at FROM supplier WHERE owner_uid=$1 ORDER BY created_at', [uid])
      const sameInitials = allSuppliers.filter(s => {
        const w = s.name.trim().split(/\s+/)
        const ini = w.length === 1 ? s.name.slice(0,2).toUpperCase() : (w[0][0]+w[1][0]).toUpperCase()
        return ini === initials && s.sid !== sid
      })
      if (sameInitials.length > 0) {
        // Append sequential number for the later-created supplier
        const laterIdx = allSuppliers.filter(s => {
          const w = s.name.trim().split(/\s+/)
          const ini = w.length === 1 ? s.name.slice(0,2).toUpperCase() : (w[0][0]+w[1][0]).toUpperCase()
          return ini === initials
        }).findIndex(s => s.sid === sid)
        if (laterIdx > 0) initials = initials + laterIdx
      }

      // Global sequence across all supplier orders for this user
      const [{ count }] = await dbq('SELECT COUNT(*) AS count FROM supplier_order WHERE owner_uid=$1', [uid])
      const seq = parseInt(count) + 1
      const mmStr = String(mm).padStart(2, '0')
      return `${seq}-${initials}-${mmStr}`
    }

    // ── Helper: calculate ETD ──────────────────────────────────────────────
    function calcETD(supplierSchedule, termName, now) {
      const delivery = supplierSchedule?.delivery || []
      const term = delivery.find(t => t.name === termName)
      if (!term) return null
      const nowMins = now.getHours() * 60 + now.getMinutes()
      const [ch, cm] = (term.cutoff || '12:00').split(':').map(Number)
      const cutoffMins = ch * 60 + cm
      const days = nowMins < cutoffMins ? (term.days_before ?? 0) : (term.days_after ?? term.days_before + 1 ?? 1)
      const etd = new Date(now)
      etd.setDate(etd.getDate() + days)
      return etd.toISOString().split('T')[0]
    }

    // ── Helper: generate PDF (purchase order or reconciliation) ─────────────
    async function generatePDF(type, order, user) {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')
      const doc = await PDFDocument.create()
      const page = doc.addPage([595, 842]) // A4
      const font = await doc.embedFont(StandardFonts.Helvetica)
      const bold = await doc.embedFont(StandardFonts.HelveticaBold)
      const { height } = page.getSize()

      // Transliterate non-WinAnsi characters so Helvetica can render them
      const CYR = {
        'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z',
        'и':'i','й':'j','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
        'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh',
        'щ':'sch','ъ':"'",'ы':'y','ь':"'",'э':'e','ю':'yu','я':'ya',
        'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'Yo','Ж':'Zh','З':'Z',
        'И':'I','Й':'J','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R',
        'С':'S','Т':'T','У':'U','Ф':'F','Х':'Kh','Ц':'Ts','Ч':'Ch','Ш':'Sh',
        'Щ':'Sch','Ъ':"'",'Ы':'Y','Ь':"'",'Э':'E','Ю':'Yu','Я':'Ya',
      }
      const safe = (str) => String(str||'').split('').map(c => {
        if (CYR[c]) return CYR[c]
        // Keep anything in WinAnsi range (0x00-0xFF), replace others with '?'
        return c.charCodeAt(0) <= 255 ? c : '?'
      }).join('')

      const fmtDate = (d) => {
        if (!d) return ''
        const dt = new Date(d)
        return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()} ${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`
      }

      let y = height - 50
      const L = 40, R = 555, MID = 300

      const drawText = (text, x, yPos, sz=10, f=font, col=rgb(0,0,0)) => {
        const s = safe(text)
        if (!s) return
        page.drawText(s, { x, y:yPos, size:sz, font:f, color:col })
      }
      const drawLine = (yPos) => {
        page.drawLine({ start:{x:L,y:yPos}, end:{x:R,y:yPos}, thickness:0.5, color:rgb(0.8,0.8,0.8) })
      }

      const title = type === 'po'
        ? `PURCHASE ORDER #${order.order_id}`
        : `RECONCILIATION REPORT #${order.order_id}RR`
      drawText(title, MID, y, 13, bold)
      y -= 30

      // Customer (left) + Supplier (right)
      const u = await dbq('SELECT * FROM "user" WHERE uid=$1', [user.uid])
      const cu = u[0] || {}
      drawText('Customer', L, y, 9, bold); drawText('Supplier', MID, y, 9, bold); y -= 14
      drawText(cu.business_name || `${cu.first_name} ${cu.last_name}`, L, y); drawText(order.supplier_name, MID, y); y -= 12
      drawText(`${cu.first_name} ${cu.last_name}`, L, y); drawText(`${order.contact_fname||''} ${order.contact_lname||''}`.trim(), MID, y); y -= 12
      drawText(cu.email||'', L, y); drawText(order.supplier_email||'', MID, y); y -= 12
      drawText(cu.phone||'', L, y); drawText(order.supplier_phone||'', MID, y); y -= 12
      drawText([cu.street_address,cu.city,cu.zip].filter(Boolean).join(', '), L, y)
      drawText([order.supplier_street,order.supplier_city,order.supplier_zip].filter(Boolean).join(', '), MID, y)
      y -= 12
      drawText('Date', L, y, 9, bold); drawText(fmtDate(order.submitted_at||order.created_at), L+50, y); y -= 20
      drawLine(y); y -= 10

      // Shipping terms + ETD
      if (order.delivery_term) {
        drawText('Shipping Terms', L, y, 9, bold); drawText('ETD', L+150, y, 9, bold); y -= 12
        drawText(order.delivery_term, L, y); drawText(order.etd ? fmtDate(order.etd).split(' ')[0] : '', L+150, y); y -= 20
        drawLine(y); y -= 10
      }

      // Reconciliation comments
      if (type === 'recon' && order.comments) {
        drawText('Comments', L, y, 9, bold); y -= 12
        drawText(order.comments, L, y); y -= 20
        drawLine(y); y -= 10
      }

      // Table header
      const cols = type === 'po'
        ? [['#',L],['SKU',L+25],['Name',L+90],['Qty',L+270],['Unit Price',L+320],['Total',L+400]]
        : [['#',L],['SKU',L+25],['Name',L+90],['Qty ord/act',L+240],['Unit Price',L+320],['Total ord/act',L+390]]
      cols.forEach(([h,x]) => drawText(h, x, y, 9, bold))
      y -= 5; drawLine(y); y -= 12

      // Items
      let subtotalOrig = 0, subtotalAct = 0
      order.items.forEach((it, idx) => {
        const tot = (it.qty_ordered||0) * (it.unit_price||0)
        const totAct = (it.qty_actual!==null&&it.qty_actual!==undefined ? it.qty_actual : it.qty_ordered) * (it.unit_price||0)
        subtotalOrig += tot; subtotalAct += totAct
        if (type === 'po') {
          [String(idx+1),it.sku||'',it.product_name||'',String(it.qty_ordered),`${it.unit_price} ${it.currency}`,`${tot.toFixed(2)}`]
            .forEach((v,i) => drawText(v, cols[i][1], y, 9))
        } else {
          const qtyDisp = `${it.qty_ordered} / ${it.qty_actual!==null&&it.qty_actual!==undefined?it.qty_actual:it.qty_ordered}`
          const totDisp = `${tot.toFixed(2)} / ${totAct.toFixed(2)}`
          const rowColor = it.qty_actual===0 ? rgb(1,0.79,0.73) : rgb(1,1,1)
          if (it.qty_actual===0) page.drawRectangle({ x:L, y:y-2, width:R-L, height:14, color:rowColor })
          ;[String(idx+1),it.sku||'',it.product_name||'',qtyDisp,`${it.unit_price} ${it.currency}`,totDisp]
            .forEach((v,i) => drawText(v, cols[i][1], y, 9))
        }
        y -= 13
      })

      drawLine(y); y -= 12
      const deliv = Number(order.delivery_fee||0)
      const vatOrig = (subtotalOrig + deliv) * 0.2
      const vatAct  = (subtotalAct  + deliv) * 0.2

      const summaryRows = type === 'po'
        ? [['Subtotal', subtotalOrig.toFixed(2)], ['Delivery', deliv.toFixed(2)], ['VAT (20%)', vatOrig.toFixed(2)], ['Total', (subtotalOrig+deliv+vatOrig).toFixed(2)]]
        : [
            ['Subtotal (orig / act)', `${subtotalOrig.toFixed(2)} / ${subtotalAct.toFixed(2)}`],
            ['Delivery', deliv.toFixed(2)],
            ['VAT (orig / act)', `${vatOrig.toFixed(2)} / ${vatAct.toFixed(2)}`],
            ['Total (orig / act)', `${(subtotalOrig+deliv+vatOrig).toFixed(2)} / ${(subtotalAct+deliv+vatAct).toFixed(2)}`],
          ]
      summaryRows.forEach(([label, val]) => {
        drawText(label, MID, y, 9, bold); drawText(val, R-80, y, 9)
        y -= 13
      })

      y -= 10
      drawText('Signature: ________________________', L, y, 9)
      drawText('Signed by: ________________________', MID, y, 9)

      const pdfBytes = await doc.save()
      return Buffer.from(pdfBytes).toString('base64')
    }

    // GET /procurement/orders — list all supplier orders
    if (r1 === 'orders' && !r2 && method === 'GET') {
      const rows = await dbq(`
        SELECT so.*, s.name AS supplier_name
        FROM supplier_order so
        JOIN supplier s ON s.sid=so.sid
        WHERE so.owner_uid=$1
        ORDER BY so.soid DESC`, [user.uid])
      return [200, rows]
    }

    // GET /procurement/orders/:soid — single order
    if (r1 === 'orders' && r2 && !segments[3] && method === 'GET') {
      const o = await fetchSO(r2)
      if (!o || o.owner_uid !== user.uid) return [404, { error:'Not found' }]
      return [200, o]
    }

    // POST /procurement/orders — create new order
    if (r1 === 'orders' && !r2 && method === 'POST') {
      const { sid, items, delivery_term, delivery_fee, currency } = body
      if (!sid) return [400, { error:'Supplier required' }]
      const now = new Date()
      const order_id = await generateOrderId(sid, user.uid, now.getMinutes())
      const [sup] = await dbq('SELECT * FROM supplier WHERE sid=$1', [sid])
      const etd = sup?.schedule ? calcETD(sup.schedule, delivery_term, now) : null
      const res = await dbr(`INSERT INTO supplier_order (owner_uid,sid,order_id,status,delivery_term,delivery_fee,currency,etd)
        VALUES ($1,$2,$3,'New',$4,$5,$6,$7) RETURNING soid`,
        [user.uid, sid, order_id, delivery_term||null, Number(delivery_fee)||0, currency||'AMD', etd])
      const soid = res.rows[0].soid
      for (const it of (items||[])) {
        await dbr('INSERT INTO supplier_order_item (soid,pid,qty_ordered,unit_price,currency) VALUES ($1,$2,$3,$4,$5)',
          [soid, it.pid, it.qty_ordered||1, it.unit_price||0, it.currency||currency||'AMD'])
      }
      return [201, await fetchSO(soid)]
    }

    // PATCH /procurement/orders/:soid — update (New status only)
    if (r1 === 'orders' && r2 && !segments[3] && method === 'PATCH') {
      const { items, delivery_term, delivery_fee, currency } = body
      const [o] = await dbq('SELECT * FROM supplier_order WHERE soid=$1 AND owner_uid=$2', [r2, user.uid])
      if (!o) return [404, { error:'Not found' }]
      if (o.status !== 'New') return [400, { error:'Only New orders can be edited' }]
      if (delivery_term !== undefined) await dbr('UPDATE supplier_order SET delivery_term=$1 WHERE soid=$2', [delivery_term, r2])
      if (delivery_fee !== undefined) await dbr('UPDATE supplier_order SET delivery_fee=$1 WHERE soid=$2', [Number(delivery_fee)||0, r2])
      if (currency !== undefined)     await dbr('UPDATE supplier_order SET currency=$1 WHERE soid=$2', [currency, r2])
      if (Array.isArray(items)) {
        await dbr('DELETE FROM supplier_order_item WHERE soid=$1', [r2])
        for (const it of items) {
          await dbr('INSERT INTO supplier_order_item (soid,pid,qty_ordered,unit_price,currency) VALUES ($1,$2,$3,$4,$5)',
            [r2, it.pid, it.qty_ordered||1, it.unit_price||0, it.currency||o.currency||'AMD'])
        }
      }
      return [200, await fetchSO(r2)]
    }

    // POST /procurement/orders/forecast — auto-create New orders from forecast deficit
    if (r1 === 'orders' && r2 === 'draft' && method === 'POST') {
      await syncDraftOrders(user.uid)
      const rows = await dbq(`SELECT so.*, s.name AS supplier_name FROM supplier_order so
        JOIN supplier s ON s.sid=so.sid WHERE so.owner_uid=$1 AND so.status='New' ORDER BY so.soid DESC`, [user.uid])
      return [200, rows]
    }


    if (r1 === 'orders' && r2 && segments[3] === 'submit' && method === 'POST') {
      const [o] = await dbq('SELECT * FROM supplier_order WHERE soid=$1 AND owner_uid=$2', [r2, user.uid])
      if (!o) return [404, { error:'Not found' }]
      if (o.status !== 'New') return [400, { error:'Only New orders can be submitted' }]
      const now = new Date()
      // Recalculate order_id minutes from current time
      const [sup] = await dbq('SELECT * FROM supplier WHERE sid=$1', [o.sid])
      const etd = sup?.schedule ? calcETD(sup.schedule, o.delivery_term, now) : o.etd
      // Update order_id to use submission minutes
      const baseId = o.order_id.slice(0, -2) + String(now.getMinutes()).padStart(2,'0')
      await dbr(`UPDATE supplier_order SET status='Submitted', submitted_at=$1, etd=$2, order_id=$3 WHERE soid=$4`,
        [now.toISOString(), etd, baseId, r2])
      const full = await fetchSO(r2)
      const pdfB64 = await generatePDF('po', full, user)
      await dbr('UPDATE supplier_order SET po_pdf_url=$1 WHERE soid=$2', [pdfB64, r2])
      return [200, { ...full, po_pdf_url: pdfB64, status:'Submitted' }]
    }

    // POST /procurement/orders/:soid/cancel
    if (r1 === 'orders' && r2 && segments[3] === 'cancel' && method === 'POST') {
      const [o] = await dbq('SELECT * FROM supplier_order WHERE soid=$1 AND owner_uid=$2', [r2, user.uid])
      if (!o) return [404, { error:'Not found' }]
      if (['Accepted','Cancelled'].includes(o.status)) return [400, { error:'Cannot cancel' }]
      await dbr(`UPDATE supplier_order SET status='Cancelled' WHERE soid=$1`, [r2])
      return [200, await fetchSO(r2)]
    }

    // DELETE /procurement/orders/:soid — hard delete New orders only
    if (r1 === 'orders' && r2 && !segments[3] && method === 'DELETE') {
      const [o] = await dbq('SELECT * FROM supplier_order WHERE soid=$1 AND owner_uid=$2', [r2, user.uid])
      if (!o) return [404, { error:'Not found' }]
      if (o.status !== 'New') return [400, { error:'Only New orders can be deleted' }]
      await dbr('DELETE FROM supplier_order_item WHERE soid=$1', [r2])
      await dbr('DELETE FROM supplier_order WHERE soid=$1', [r2])
      return [200, { deleted: true }]
    }

    // POST /procurement/orders/:soid/accept — accept with reconciliation
    if (r1 === 'orders' && r2 && segments[3] === 'accept' && method === 'POST') {
      const { items_actual, items_added, comments } = body
      const [o] = await dbq('SELECT * FROM supplier_order WHERE soid=$1 AND owner_uid=$2', [r2, user.uid])
      if (!o) return [404, { error:'Not found' }]
      if (o.status !== 'Submitted') return [400, { error:'Only Submitted orders can be accepted' }]
      // Update existing items' actual quantities
      for (const it of (items_actual||[])) {
        await dbr('UPDATE supplier_order_item SET qty_actual=$1 WHERE soiid=$2 AND soid=$3',
          [it.qty_actual, it.soiid, r2])
      }
      // Insert newly added items (substitutions)
      for (const it of (items_added||[])) {
        if (!it.pid) continue
        await dbr(`INSERT INTO supplier_order_item (soid,pid,qty_ordered,qty_actual,unit_price,currency)
          VALUES ($1,$2,0,$3,$4,$5)`, [r2, it.pid, it.qty_actual||0, it.unit_price||0, it.currency||o.currency||'AMD'])
      }
      const now = new Date()
      await dbr(`UPDATE supplier_order SET status='Accepted', accepted_at=$1, comments=$2 WHERE soid=$3`,
        [now.toISOString(), comments||null, r2])
      const full = await fetchSO(r2)
      // Update inventory: add qty_actual of each item to product_stock
      for (const it of full.items) {
        const qty = Number(it.qty_actual ?? it.qty_ordered)
        if (qty > 0) {
          await dbr(`INSERT INTO product_stock (pid, owner_uid, qty, source, source_id, created_at)
            VALUES ($1,$2,$3,'supplier_order',$4,$5)
            ON CONFLICT (pid, owner_uid, source, source_id) DO UPDATE SET qty=$3`,
            [it.pid, user.uid, qty, r2, now.toISOString()])
        }
      }
      // Check for discrepancies
      const hasDiscrepancy = full.items.some(it =>
        it.qty_actual !== null && Number(it.qty_actual) !== Number(it.qty_ordered)
      )
      let reconB64 = null
      if (hasDiscrepancy) {
        reconB64 = await generatePDF('recon', full, user)
        await dbr('UPDATE supplier_order SET recon_pdf_url=$1 WHERE soid=$2', [reconB64, r2])
      }
      return [200, { ...full, status:'Accepted', has_discrepancy:hasDiscrepancy, recon_pdf_url:reconB64 }]
    }

    // GET /procurement/orders/:soid/pdf — serve PO or recon PDF as base64
    if (r1 === 'orders' && r2 && segments[3] === 'pdf' && method === 'GET') {
      const col = segments[4] === 'recon' ? 'recon_pdf_url' : 'po_pdf_url'
      const [row] = await dbq(`SELECT ${col} FROM supplier_order WHERE soid=$1 AND owner_uid=$2`, [r2, user.uid])
      if (!row?.[col]) return [404, { error:'PDF not found' }]
      return [200, { pdf: row[col] }]
    }

    // GET /procurement — product-supplier links for ProductsPage
    if (method === 'GET' && !r1) {
      const products = await dbq(`
        SELECT p.pid, p.name, p.sku, p.expiry_hours,
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

  // ── STAFF ─────────────────────────────────────────────────────────────────
  if (r0 === 'staff') {
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]

    const fetchEmployee = async (uid) => {
      const [emp] = await dbq(`SELECT uid, first_name, last_name, email, phone, street_address, city, zip, is_employee, employee_seq FROM "user" WHERE uid=$1`, [uid])
      if (!emp) return null
      const roles  = await dbq(`SELECT r.rid, r.name FROM employee_role er JOIN role r ON r.rid=er.rid WHERE er.uid=$1 ORDER BY r.name`, [uid])
      const skills = await dbq(`SELECT s.skid, s.name FROM employee_skill es JOIN skill s ON s.skid=es.skid WHERE es.uid=$1 ORDER BY s.name`, [uid])
      return { ...emp, roles, skills }
    }

    // GET /staff/lookup?email=... — check if a Tanelu user exists with this email
    if (r1 === 'lookup' && method === 'GET') {
      const email = event?.queryStringParameters?.email
      if (!email) return [400, { error: 'email required' }]
      const [found] = await dbq(
        `SELECT uid, first_name, last_name, email, phone, street_address, city, zip, email_verified
         FROM "user" WHERE email=$1 AND employer_uid IS NULL`, [email.toLowerCase()])
      return [200, found || null]
    }

    if (!r1 && method === 'GET') {
      const emps = await dbq(`SELECT uid, first_name, last_name, email, is_employee, employee_seq FROM "user" WHERE employer_uid=$1 ORDER BY first_name, last_name`, [user.uid])
      const result = []
      for (const e of emps) {
        const roles  = await dbq(`SELECT r.name FROM employee_role er JOIN role r ON r.rid=er.rid WHERE er.uid=$1 ORDER BY r.name`, [e.uid])
        const skills = await dbq(`SELECT s.name FROM employee_skill es JOIN skill s ON s.skid=es.skid WHERE es.uid=$1 ORDER BY s.name`, [e.uid])
        result.push({ ...e, roles: roles.map(r=>r.name), skills: skills.map(s=>s.name) })
      }
      return [200, result]
    }

    if (!r1 && method === 'POST') {
      const { first_name, last_name, email, phone, street_address, city, zip, is_employee: isEmp, role_ids, skill_ids } = body
      if (!first_name || !last_name) return [400, { error: 'First and last name required' }]
      const [{ max }] = await dbq(`SELECT COALESCE(MAX(employee_seq),0) AS max FROM "user" WHERE employer_uid=$1`, [user.uid])
      const seq = Number(max) + 1

      let newUid

      // If email provided, check for any existing user with this email (verified or not)
      if (email) {
        const [existing] = await dbq(`SELECT uid, employer_uid FROM "user" WHERE email=$1`, [email.toLowerCase()])
        if (existing) {
          if (existing.employer_uid && String(existing.employer_uid) !== String(user.uid)) {
            return [409, { error: 'This email is already linked to a different restaurant' }]
          }
          // Link existing user — do NOT create a new row
          await dbr(`UPDATE "user" SET employer_uid=$1, employee_seq=$2, is_employee=true WHERE uid=$3`,
            [user.uid, seq, existing.uid])
          newUid = existing.uid
        }
      }

      if (!newUid) {
        // No existing user found — create a brand new employee-only record
        const res = await dbr(
          `INSERT INTO "user" (first_name,last_name,email,phone,street_address,city,zip,is_employee,employer_uid,employee_seq,password_hash,email_verified)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'$2b$10$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',false) RETURNING uid`,
          [first_name, last_name, email||null, phone||null, street_address||null, city||null, zip||null, !!isEmp, user.uid, seq])
        newUid = res.rows[0].uid
      }

      for (const rid  of (role_ids  ||[])) await dbr('INSERT INTO employee_role  (uid,rid)  VALUES ($1,$2) ON CONFLICT DO NOTHING', [newUid, rid])
      for (const skid of (skill_ids ||[])) await dbr('INSERT INTO employee_skill (uid,skid) VALUES ($1,$2) ON CONFLICT DO NOTHING', [newUid, skid])
      return [201, await fetchEmployee(newUid)]
    }

    if (r1 && method === 'PATCH') {
      const { first_name, last_name, email, phone, street_address, city, zip, is_employee: isEmp, role_ids, skill_ids } = body
      const [emp] = await dbq('SELECT uid FROM "user" WHERE uid=$1 AND employer_uid=$2', [r1, user.uid])
      if (!emp) return [404, { error: 'Employee not found' }]
      const sets = { first_name, last_name, email, phone, street_address, city, zip }
      for (const [col, val] of Object.entries(sets)) {
        if (val !== undefined) await dbr(`UPDATE "user" SET ${col}=$1 WHERE uid=$2`, [val||null, r1])
      }
      if (isEmp !== undefined) await dbr('UPDATE "user" SET is_employee=$1 WHERE uid=$2', [!!isEmp, r1])
      if (Array.isArray(role_ids)) {
        await dbr('DELETE FROM employee_role WHERE uid=$1', [r1])
        for (const rid  of role_ids)  await dbr('INSERT INTO employee_role  (uid,rid)  VALUES ($1,$2) ON CONFLICT DO NOTHING', [r1, rid])
      }
      if (Array.isArray(skill_ids)) {
        await dbr('DELETE FROM employee_skill WHERE uid=$1', [r1])
        for (const skid of skill_ids) await dbr('INSERT INTO employee_skill (uid,skid) VALUES ($1,$2) ON CONFLICT DO NOTHING', [r1, skid])
      }
      return [200, await fetchEmployee(r1)]
    }

    if (!r1 && method === 'DELETE') {
      const { ids } = body
      if (!Array.isArray(ids)||!ids.length) return [400, { error: 'ids required' }]
      for (const uid of ids) {
        const [emp] = await dbq('SELECT uid, email_verified, password_hash FROM "user" WHERE uid=$1 AND employer_uid=$2', [uid, user.uid])
        if (!emp) continue
        await dbr('DELETE FROM employee_role  WHERE uid=$1', [uid])
        await dbr('DELETE FROM employee_skill WHERE uid=$1', [uid])
        // If this is a real Tanelu account (email verified), just unlink — don't delete the row
        if (emp.email_verified || (emp.password_hash && !emp.password_hash.includes('xxxxxxxxxxx'))) {
          await dbr('UPDATE "user" SET employer_uid=NULL, employee_seq=NULL, is_employee=false WHERE uid=$1', [uid])
        } else {
          // Employee-only record — safe to delete entirely
          await dbr('DELETE FROM "user" WHERE uid=$1', [uid])
        }
      }
      return [200, { deleted: ids }]
    }
  }

  // ── ROLES ──────────────────────────────────────────────────────────────────
  if (r0 === 'roles') {
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]
    const PALETTE = ['#7c3aed','#0891b2','#059669','#dc2626','#d97706','#db2777','#2563eb','#65a30d']
    const fetchRole = async (rid) => {
      const [role] = await dbq('SELECT * FROM role WHERE rid=$1', [rid])
      if (!role) return null
      const skills = await dbq(`SELECT s.skid, s.name, s.duration, s.duration_unit, s.dep_type, s.dep_skid, s.color FROM role_skill rs JOIN skill s ON s.skid=rs.skid WHERE rs.rid=$1 ORDER BY s.name`, [rid])
      return { ...role, skills }
    }
    if (method === 'GET') {
      const roles = await dbq('SELECT * FROM role WHERE owner_uid=$1 ORDER BY name', [user.uid])
      const result = []
      for (const ro of roles) {
        const skills = await dbq(`SELECT s.skid, s.name, s.duration, s.duration_unit, s.dep_type, s.dep_skid, s.color FROM role_skill rs JOIN skill s ON s.skid=rs.skid WHERE rs.rid=$1 ORDER BY s.name`, [ro.rid])
        result.push({ ...ro, skills })
      }
      return [200, result]
    }
    if (!r1 && method === 'POST') {
      const { name, skill_ids } = body
      if (!name?.trim()) return [400, { error: 'Role name required' }]
      // Auto-assign color from palette
      const existing = await dbq('SELECT color FROM role WHERE owner_uid=$1', [user.uid])
      const usedColors = existing.map(r=>r.color)
      const color = PALETTE.find(c=>!usedColors.includes(c)) || PALETTE[existing.length % PALETTE.length]
      const res = await dbr('INSERT INTO role (owner_uid,name,color) VALUES ($1,$2,$3) ON CONFLICT (owner_uid,name) DO UPDATE SET name=EXCLUDED.name RETURNING rid', [user.uid, name.trim(), color])
      const rid = res.rows[0].rid
      if (Array.isArray(skill_ids)) {
        await dbr('DELETE FROM role_skill WHERE rid=$1', [rid])
        for (const skid of skill_ids) {
          await dbr('INSERT INTO role_skill (rid,skid) VALUES ($1,$2) ON CONFLICT DO NOTHING', [rid, skid])
          // Assign role color to skill if skill has no color yet
          await dbr('UPDATE skill SET color=$1 WHERE skid=$2 AND color IS NULL', [color, skid])
        }
      }
      return [201, await fetchRole(rid)]
    }
    if (r1 && method === 'PATCH') {
      const { name, skill_ids } = body
      const [role] = await dbq('SELECT * FROM role WHERE rid=$1 AND owner_uid=$2', [r1, user.uid])
      if (!role) return [404, { error: 'Role not found' }]
      if (name !== undefined) await dbr('UPDATE role SET name=$1 WHERE rid=$2', [name.trim(), r1])
      if (Array.isArray(skill_ids)) {
        await dbr('DELETE FROM role_skill WHERE rid=$1', [r1])
        for (const skid of skill_ids) {
          await dbr('INSERT INTO role_skill (rid,skid) VALUES ($1,$2) ON CONFLICT DO NOTHING', [r1, skid])
          await dbr('UPDATE skill SET color=$1 WHERE skid=$2 AND color IS NULL', [role.color, skid])
        }
      }
      return [200, await fetchRole(r1)]
    }
    if (method === 'DELETE') {
      const { ids } = body
      if (!Array.isArray(ids)||!ids.length) return [400, { error: 'ids required' }]
      for (const rid of ids) {
        await dbr('DELETE FROM role_skill    WHERE rid=$1', [rid])
        await dbr('DELETE FROM employee_role WHERE rid=$1', [rid])
        await dbr('DELETE FROM role WHERE rid=$1 AND owner_uid=$2', [rid, user.uid])
      }
      await dbr(`DELETE FROM skill WHERE owner_uid=$1 AND skid NOT IN (SELECT skid FROM role_skill) AND skid NOT IN (SELECT skid FROM employee_skill) AND created_at < NOW() - INTERVAL '30 days'`, [user.uid])
      return [200, { deleted: ids }]
    }
  }

  // ── SKILLS ─────────────────────────────────────────────────────────────────
  if (r0 === 'skills') {
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]
    if (method === 'GET') {
      return [200, await dbq('SELECT * FROM skill WHERE owner_uid=$1 ORDER BY name', [user.uid])]
    }
    if (method === 'POST') {
      const { name, duration, duration_unit, dep_type, dep_skid } = body
      if (!name?.trim()) return [400, { error: 'Skill name required' }]
      const res = await dbr(
        `INSERT INTO skill (owner_uid,name,duration,duration_unit,dep_type,dep_skid)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (owner_uid,name) DO UPDATE SET name=EXCLUDED.name RETURNING *`,
        [user.uid, name.trim(), duration||null, duration_unit||'minutes', dep_type||null, dep_skid||null])
      return [201, res.rows[0]]
    }
    if (r1 && method === 'PATCH') {
      const { name, duration, duration_unit, dep_type, dep_skid } = body
      const sets = [], vals = [r1]
      if (name          !== undefined) { sets.push(`name=$${vals.length+1}`);          vals.push(name.trim()) }
      if (duration      !== undefined) { sets.push(`duration=$${vals.length+1}`);      vals.push(duration||null) }
      if (duration_unit !== undefined) { sets.push(`duration_unit=$${vals.length+1}`); vals.push(duration_unit) }
      if (dep_type      !== undefined) { sets.push(`dep_type=$${vals.length+1}`);      vals.push(dep_type||null) }
      if (dep_skid      !== undefined) { sets.push(`dep_skid=$${vals.length+1}`);      vals.push(dep_skid||null) }
      if (sets.length) await dbr(`UPDATE skill SET ${sets.join(',')} WHERE skid=$1`, vals)
      const [s] = await dbq('SELECT * FROM skill WHERE skid=$1', [r1])
      return [200, s]
    }
    if (method === 'DELETE') {
      const { ids } = body
      if (!Array.isArray(ids)||!ids.length) return [400, { error: 'ids required' }]
      for (const skid of ids) {
        await dbr('DELETE FROM role_skill     WHERE skid=$1', [skid])
        await dbr('DELETE FROM employee_skill WHERE skid=$1', [skid])
        await dbr('DELETE FROM skill WHERE skid=$1 AND owner_uid=$2', [skid, user.uid])
      }
      return [200, { deleted: ids }]
    }
  }

  // ── PROCESSES (v12) ────────────────────────────────────────────────────────
  if (r0 === 'processes') {
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]
    const fetchProcess = async (procid) => {
      const [proc] = await dbq('SELECT * FROM process WHERE procid=$1', [procid])
      if (!proc) return null
      const skills = await dbq(
        `SELECT ps.psid, ps.seq, ps.duration, ps.duration_unit, ps.dep_type, ps.dep_psid,
                s.skid, s.name, s.color
         FROM process_skill ps JOIN skill s ON s.skid=ps.skid
         WHERE ps.procid=$1 ORDER BY ps.seq`, [procid])
      return { ...proc, skills }
    }
    if (!r1 && method === 'GET') {
      const procs = await dbq('SELECT * FROM process WHERE owner_uid=$1 ORDER BY name', [user.uid])
      const result = []
      for (const p of procs) {
        const skills = await dbq(
          `SELECT ps.psid, ps.seq, ps.duration, ps.duration_unit, ps.dep_type, ps.dep_psid,
                  s.skid, s.name, s.color
           FROM process_skill ps JOIN skill s ON s.skid=ps.skid WHERE ps.procid=$1 ORDER BY ps.seq`, [p.procid])
        result.push({ ...p, skills })
      }
      return [200, result]
    }
    if (!r1 && method === 'POST') {
      const { name } = body
      if (!name?.trim()) return [400, { error: 'Name required' }]
      const res = await dbr('INSERT INTO process (owner_uid,name) VALUES ($1,$2) RETURNING *', [user.uid, name.trim()])
      return [201, await fetchProcess(res.rows[0].procid)]
    }
    if (r1 && method === 'PATCH') {
      const { name, skills } = body
      const [proc] = await dbq('SELECT * FROM process WHERE procid=$1 AND owner_uid=$2', [r1, user.uid])
      if (!proc) return [404, { error: 'Not found' }]
      if (name !== undefined) await dbr('UPDATE process SET name=$1 WHERE procid=$2', [name.trim(), r1])
      if (Array.isArray(skills)) {
        await dbr('DELETE FROM process_skill WHERE procid=$1', [r1])
        // First pass: insert all rows to get psids
        const inserted = []
        for (const [i, s] of skills.entries()) {
          const res = await dbr(
            `INSERT INTO process_skill (procid,skid,seq,duration,duration_unit) VALUES ($1,$2,$3,$4,$5) RETURNING psid`,
            [r1, s.skid, i+1, s.duration||null, s.duration_unit||'minutes'])
          inserted.push({ ...s, psid: res.rows[0].psid, idx: i })
        }
        // Second pass: set dep_psid by matching dep_seq reference
        for (const [i, s] of skills.entries()) {
          if (s.dep_type && s.dep_seq != null) {
            const depRow = inserted.find(x=>x.idx===Number(s.dep_seq)-1)
            if (depRow) {
              await dbr('UPDATE process_skill SET dep_type=$1, dep_psid=$2 WHERE psid=$3',
                [s.dep_type, depRow.psid, inserted[i].psid])
            }
          }
        }
      }
      return [200, await fetchProcess(r1)]
    }
    if (r1 && method === 'DELETE') {
      await dbr('DELETE FROM process_skill WHERE procid=$1', [r1])
      await dbr('DELETE FROM process WHERE procid=$1 AND owner_uid=$2', [r1, user.uid])
      return [200, { deleted: Number(r1) }]
    }
  }

  // ── ROSTER ─────────────────────────────────────────────────────────────────
  if (r0 === 'roster') {
    if (!user) return [401, { error: 'Unauthorized' }]

    async function getRosterByWeek(ownerUid, weekStart) {
      const [r] = await dbq('SELECT * FROM roster WHERE owner_uid=$1 AND week_start=$2', [ownerUid, weekStart])
      return r || null
    }

    async function fetchRoster(roid) {
      const [r] = await dbq('SELECT * FROM roster WHERE roid=$1', [roid])
      if (!r) return null
      const slots = await dbq(
        `SELECT rs.rsid, rs.roid, rs.uid, rs.finalized,
                TO_CHAR(rs.slot_date, 'YYYY-MM-DD') AS slot_date,
                TO_CHAR(rs.start_time, 'HH24:MI') AS start_time,
                TO_CHAR(rs.end_time,   'HH24:MI') AS end_time,
                u.first_name, u.last_name,
                (SELECT r2.name FROM employee_role er JOIN role r2 ON r2.rid=er.rid WHERE er.uid=rs.uid ORDER BY r2.name LIMIT 1) AS role_name
         FROM roster_slot rs JOIN "user" u ON u.uid=rs.uid
         WHERE rs.roid=$1 ORDER BY rs.slot_date, rs.start_time`, [roid])
      const employees = await dbq(
        `SELECT u.uid, u.first_name, u.last_name,
                (SELECT r2.name FROM employee_role er JOIN role r2 ON r2.rid=er.rid WHERE er.uid=u.uid ORDER BY r2.name LIMIT 1) AS role_name
         FROM "user" u WHERE u.employer_uid=$1 ORDER BY u.first_name`, [r.owner_uid])
      return { ...r, slots, employees }
    }

    const ownerUid = user.is_manufacturer ? user.uid : user.employer_uid

    if (method === 'GET' && !r1) {
      const week = event?.queryStringParameters?.week
      if (!week) return [400, { error: 'week required' }]
      if (!ownerUid) return [403, { error: 'Not associated with a restaurant' }]
      const roster = await getRosterByWeek(ownerUid, week)
      if (!roster) {
        const employees = await dbq(`SELECT u.uid, u.first_name, u.last_name FROM "user" u WHERE u.employer_uid=$1 ORDER BY u.first_name`, [ownerUid])
        return [200, { week_start:week, status:'unpublished', slots:[], employees }]
      }
      return [200, await fetchRoster(roster.roid)]
    }

    if (method === 'POST' && !r1) {
      if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
      const { week_start, auto_clone, auto_approve } = body
      if (!week_start) return [400, { error: 'week_start required' }]
      const res = await dbr(
        `INSERT INTO roster (owner_uid,week_start,auto_clone,auto_approve)
         VALUES ($1,$2,$3,$4) ON CONFLICT (owner_uid,week_start)
         DO UPDATE SET auto_clone=EXCLUDED.auto_clone,auto_approve=EXCLUDED.auto_approve RETURNING *`,
        [user.uid, week_start, !!auto_clone, !!auto_approve])
      return [200, await fetchRoster(res.rows[0].roid)]
    }

    if (r1 && r2 === 'publish' && method === 'POST') {
      if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
      const [r] = await dbq('SELECT * FROM roster WHERE roid=$1 AND owner_uid=$2', [r1, user.uid])
      if (!r) return [404, { error: 'Not found' }]
      await dbr(`UPDATE roster SET status='published',published_at=NOW() WHERE roid=$1`, [r1])
      const emps = await dbq(`SELECT email, first_name FROM "user" WHERE employer_uid=$1 AND email IS NOT NULL`, [user.uid])
      const wk = new Date(r.week_start).toLocaleDateString('en-GB',{day:'numeric',month:'short'})
      for (const e of emps) {
        await sendMail(e.email, `Roster published — week of ${wk}`,
          `Hi ${e.first_name}, the roster for week of ${wk} is now open. Please post your availability.`,
          mailHtml('Roster published', `The roster for the week of ${wk} is now open for editing. Please log in and post your available time slots.`, `${BASE_URL}/#roster`, 'Open roster'))
      }
      return [200, await fetchRoster(r1)]
    }

    if (r1 && r2 === 'unpublish' && method === 'POST') {
      if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
      const [r] = await dbq('SELECT * FROM roster WHERE roid=$1 AND owner_uid=$2', [r1, user.uid])
      if (!r) return [404, { error: 'Not found' }]
      const weekStart = new Date(r.week_start)
      const deadline = new Date(weekStart); deadline.setDate(deadline.getDate()-1); deadline.setHours(23,59,59)
      if (new Date() > deadline) return [400, { error: 'Cannot unpublish after roster week starts' }]
      await dbr(`UPDATE roster SET status='unpublished' WHERE roid=$1`, [r1])
      return [200, await fetchRoster(r1)]
    }

    if (r1 && r2 === 'approve' && method === 'POST') {
      if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
      const [r] = await dbq('SELECT * FROM roster WHERE roid=$1 AND owner_uid=$2', [r1, user.uid])
      if (!r) return [404, { error: 'Not found' }]
      if (!['published','unapproved'].includes(r.status)) return [400, { error: 'Must be published first' }]
      await dbr(`UPDATE roster SET status='approved',approved_at=NOW() WHERE roid=$1`, [r1])
      const emps = await dbq(`SELECT email, first_name FROM "user" WHERE employer_uid=$1 AND email IS NOT NULL`, [user.uid])
      const wk = new Date(r.week_start).toLocaleDateString('en-GB',{day:'numeric',month:'short'})
      for (const e of emps) {
        await sendMail(e.email, `Roster approved — week of ${wk}`,
          `Hi ${e.first_name}, the roster for week of ${wk} has been approved. Your schedule is now final.`,
          mailHtml('Roster approved', `The roster for the week of ${wk} is approved and mandatory.`, `${BASE_URL}/#roster`, 'View roster'))
      }
      return [200, await fetchRoster(r1)]
    }

    if (r1 && r2 === 'unapprove' && method === 'POST') {
      if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
      const [r] = await dbq('SELECT * FROM roster WHERE roid=$1 AND owner_uid=$2', [r1, user.uid])
      if (!r) return [404, { error: 'Not found' }]
      if (r.status !== 'approved') return [400, { error: 'Roster is not approved' }]
      await dbr(`UPDATE roster SET status='unapproved' WHERE roid=$1`, [r1])
      return [200, await fetchRoster(r1)]
    }

    if (r1 && r2 === 'clone' && method === 'POST') {
      if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
      const [r] = await dbq('SELECT * FROM roster WHERE roid=$1 AND owner_uid=$2', [r1, user.uid])
      if (!r) return [404, { error: 'Not found' }]
      const tgtDate = new Date(r.week_start); tgtDate.setDate(tgtDate.getDate()+7)
      const tgtStr = tgtDate.toISOString().split('T')[0]
      const [existing] = await dbq('SELECT roid FROM roster WHERE owner_uid=$1 AND week_start=$2', [user.uid, tgtStr])
      if (existing) {
        const [hasSlots] = await dbq('SELECT rsid FROM roster_slot WHERE roid=$1 LIMIT 1', [existing.roid])
        if (hasSlots) return [400, { error: 'Target week already has slots — cannot overwrite' }]
      }
      const res = await dbr(
        `INSERT INTO roster (owner_uid,week_start,cloned_from,auto_clone,auto_approve)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (owner_uid,week_start) DO UPDATE SET cloned_from=$3 RETURNING *`,
        [user.uid, tgtStr, r.roid, r.auto_clone, r.auto_approve])
      const newRoid = res.rows[0].roid
      const slots = await dbq('SELECT * FROM roster_slot WHERE roid=$1', [r.roid])
      for (const s of slots) {
        const d = new Date(s.slot_date); d.setDate(d.getDate()+7)
        await dbr('INSERT INTO roster_slot (roid,uid,slot_date,start_time,end_time) VALUES ($1,$2,$3,$4,$5)',
          [newRoid, s.uid, d.toISOString().split('T')[0], s.start_time, s.end_time])
      }
      return [201, await fetchRoster(newRoid)]
    }

    if (r1 && r2 === 'slots' && method === 'POST') {
      if (!ownerUid) return [403, { error: 'Not associated with a restaurant' }]
      const [r] = await dbq('SELECT * FROM roster WHERE roid=$1 AND owner_uid=$2', [r1, ownerUid])
      if (!r) return [404, { error: 'Not found' }]
      if (r.status !== 'published' && !user.is_manufacturer) return [400, { error: 'Roster not open for editing' }]
      const { slots, finalize, uid: slotUid } = body
      const empUid = user.is_manufacturer ? (slotUid||user.uid) : user.uid
      await dbr('DELETE FROM roster_slot WHERE roid=$1 AND uid=$2', [r1, empUid])
      for (const s of (slots||[])) {
        await dbr('INSERT INTO roster_slot (roid,uid,slot_date,start_time,end_time,finalized) VALUES ($1,$2,$3,$4,$5,$6)',
          [r1, empUid, s.slot_date, s.start_time, s.end_time, !!finalize])
      }
      if (!user.is_manufacturer) {
        const [owner] = await dbq(`SELECT email FROM "user" WHERE uid=$1`, [ownerUid])
        const wk = new Date(r.week_start).toLocaleDateString('en-GB',{day:'numeric',month:'short'})
        if (owner?.email) {
          await sendMail(owner.email, `${user.first_name} posted roster slots — week of ${wk}`,
            `${user.first_name} saved their roster for week of ${wk}.`,
            mailHtml('Roster slots posted', `${user.first_name} saved their availability for the week of ${wk}.`, `${BASE_URL}/`, 'View roster'))
        }
        if (finalize) {
          const allEmps = await dbq('SELECT uid FROM "user" WHERE employer_uid=$1', [ownerUid])
          const fin = await dbq('SELECT DISTINCT uid FROM roster_slot WHERE roid=$1 AND finalized=true', [r1])
          if (fin.length >= allEmps.length && allEmps.length > 0 && owner?.email) {
            await sendMail(owner.email, `All employees finalized — week of ${wk}`,
              `All employees have posted their roster for week of ${wk}.`,
              mailHtml('All slots finalized', `All employees have finalized their availability for the week of ${wk}.`, `${BASE_URL}/`, 'View roster'))
          }
        }
      }
      return [200, await fetchRoster(r1)]
    }

    if (r1 && r2 === 'slots' && method === 'DELETE') {
      const { rsid } = body
      if (rsid) await dbr('DELETE FROM roster_slot WHERE rsid=$1', [rsid])
      return [200, { deleted: rsid }]
    }

    if (r1 && !r2 && method === 'PATCH') {
      if (!user.is_manufacturer) return [403, { error: 'Manufacturers only' }]
      const { auto_clone, auto_approve } = body
      if (auto_clone  !== undefined) await dbr('UPDATE roster SET auto_clone=$1  WHERE roid=$2 AND owner_uid=$3', [!!auto_clone,  r1, user.uid])
      if (auto_approve !== undefined) await dbr('UPDATE roster SET auto_approve=$1 WHERE roid=$2 AND owner_uid=$3', [!!auto_approve, r1, user.uid])
      return [200, await fetchRoster(r1)]
    }
  }

  // ── EMBED SETTINGS (authenticated, manufacturer only) ─────────────────────
  if (r0 === 'embed' && r1 === 'settings') {
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]
    // Ensure table exists (safe to run every time)
    await dbr(`CREATE TABLE IF NOT EXISTS embed_settings (
      esid SERIAL PRIMARY KEY, uid INTEGER NOT NULL UNIQUE REFERENCES "user"(uid),
      enabled BOOLEAN NOT NULL DEFAULT false, allow_order BOOLEAN NOT NULL DEFAULT false,
      checkout_mode VARCHAR(10) NOT NULL DEFAULT 'inline', allowed_domains TEXT[],
      api_key VARCHAR(64) NOT NULL DEFAULT encode(gen_random_bytes(32),'hex'),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`)
    await dbr(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'app'`)
    await dbr(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS delivery_street TEXT`)
    await dbr(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS delivery_city TEXT`)
    await dbr(`ALTER TABLE "order" ADD COLUMN IF NOT EXISTS delivery_zip TEXT`)
    if (method === 'GET') {
      const [s] = await dbq('SELECT * FROM embed_settings WHERE uid=$1', [user.uid])
      if (!s) {
        // Auto-create on first access
        const [created] = await dbq(
          `INSERT INTO embed_settings (uid) VALUES ($1) RETURNING *`, [user.uid])
        return [200, created]
      }
      return [200, s]
    }
    if (method === 'PATCH') {
      const { enabled, allow_order, checkout_mode, allowed_domains } = body
      await dbq(`INSERT INTO embed_settings (uid) VALUES ($1) ON CONFLICT (uid) DO NOTHING`, [user.uid])
      const sets = [], vals = []
      if (enabled       !== undefined) { sets.push(`enabled=$${vals.length+2}`);       vals.push(!!enabled) }
      if (allow_order   !== undefined) { sets.push(`allow_order=$${vals.length+2}`);   vals.push(!!allow_order) }
      if (checkout_mode !== undefined) { sets.push(`checkout_mode=$${vals.length+2}`); vals.push(checkout_mode) }
      if (allowed_domains !== undefined) { sets.push(`allowed_domains=$${vals.length+2}`); vals.push(allowed_domains) }
      if (sets.length) {
        sets.push(`updated_at=NOW()`)
        await dbq(`UPDATE embed_settings SET ${sets.join(',')} WHERE uid=$1`, [user.uid, ...vals])
      }
      const [s] = await dbq('SELECT * FROM embed_settings WHERE uid=$1', [user.uid])
      return [200, s]
    }
    if (method === 'POST' && r2 === 'rotate-key') {
      await dbq(`INSERT INTO embed_settings (uid) VALUES ($1) ON CONFLICT (uid) DO NOTHING`, [user.uid])
      const [s] = await dbq(
        `UPDATE embed_settings SET api_key=encode(gen_random_bytes(32),'hex'), updated_at=NOW()
         WHERE uid=$1 RETURNING *`, [user.uid])
      return [200, s]
    }
    if (method === 'POST' && r2 === 'test') {
      // Connectivity test — just return OK with embed endpoint URL
      const [s] = await dbq('SELECT * FROM embed_settings WHERE uid=$1', [user.uid])
      return [200, { ok: true, enabled: s?.enabled, endpoint: `${BASE_URL}/api/embed/menu` }]
    }
  }

  // ── PUBLIC EMBED API (no auth, CORS-open, checks api_key param) ─────────────
  if (r0 === 'embed' && r1 !== 'settings') {
    // All embed routes require ?key=API_KEY
    const apiKey = event?.queryStringParameters?.key
    if (!apiKey) return [401, { error: 'API key required (?key=...)' }]
    const [settings] = await dbq(
      `SELECT es.*, u.first_name, u.last_name, u.business_name
       FROM embed_settings es JOIN "user" u ON u.uid=es.uid
       WHERE es.api_key=$1`, [apiKey])
    if (!settings) return [401, { error: 'Invalid API key' }]
    if (!settings.enabled) return [403, { error: 'Embedded menu is disabled' }]

    // Check origin against allowed_domains
    const origin = event?.headers?.origin || event?.headers?.referer || ''
    if (settings.allowed_domains && settings.allowed_domains.length > 0) {
      const allowed = settings.allowed_domains.some(d => origin.includes(d))
      if (!allowed) return [403, { error: `Origin not allowed: ${origin}` }]
    }

    const ownerUid = settings.uid

    // GET /embed/menu — list available menus
    if (r1 === 'menu' && !r2 && method === 'GET') {
      const { from, to } = event?.queryStringParameters || {}
      let query = `SELECT mid, name, available, delivery_fee, currency, hours_from, hours_until, hours_days FROM menu WHERE owner_uid=$1 AND available=true`
      const params = [ownerUid]
      const menus = await dbq(query, params)
      return [200, { menus, settings: { allow_order: settings.allow_order, checkout_mode: settings.checkout_mode, owner_name: settings.business_name || `${settings.first_name} ${settings.last_name}` } }]
    }

    // GET /embed/menu/:mid — full menu with recipes
    if (r1 === 'menu' && r2 && method === 'GET') {
      const menu = await fetchMenu(r2)
      if (!menu || menu.owner_uid !== ownerUid) return [404, { error: 'Menu not found' }]
      return [200, { menu, settings: { allow_order: settings.allow_order, checkout_mode: settings.checkout_mode } }]
    }

    // GET /embed/item/:rid — single item
    if (r1 === 'item' && r2 && method === 'GET') {
      const rows = await dbq(RECIPE_SEL + ' WHERE r.rid=$1 AND r.deleted=false', [r2])
      if (!rows.length) return [404, { error: 'Item not found' }]
      return [200, { item: rows[0], settings: { allow_order: settings.allow_order, checkout_mode: settings.checkout_mode } }]
    }

    // POST /embed/orders — place guest order
    if (r1 === 'orders' && method === 'POST') {
      if (!settings.allow_order) return [403, { error: 'Ordering is disabled for this embed' }]
      const { mid, items, guest_name, guest_email, guest_phone, pickup, delivery_address } = body
      if (!mid || !items?.length) return [400, { error: 'mid and items required' }]
      if (!guest_name) return [400, { error: 'guest_name required' }]
      // Validate menu belongs to owner
      const [menu] = await dbq('SELECT * FROM menu WHERE mid=$1 AND owner_uid=$2', [mid, ownerUid])
      if (!menu) return [404, { error: 'Menu not found' }]
      // Create order
      const res = await dbr(
        `INSERT INTO "order" (owner_uid, mid, pickup, walkin_name, delivery_street, delivery_city, delivery_zip, source, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'embed','New') RETURNING oid`,
        [ownerUid, mid, !!pickup,
         `${guest_name}${guest_email?' <'+guest_email+'>':''}${guest_phone?' '+guest_phone:''}`,
         delivery_address?.street||null, delivery_address?.city||null, delivery_address?.zip||null])
      const oid = res.rows[0].oid
      for (const it of items) {
        const [recipe] = await dbq('SELECT price FROM recipe WHERE rid=$1', [it.rid])
        if (!recipe) continue
        await dbr('INSERT INTO order_item (oid, rid, qty, price) VALUES ($1,$2,$3,$4)',
          [oid, it.rid, it.qty, recipe.price])
      }
      return [201, { oid, message: 'Order placed successfully' }]
    }

    // GET /embed/orders/:oid — check order status (for guest tracking)
    if (r1 === 'orders' && r2 && method === 'GET') {
      const [order] = await dbq(
        `SELECT o.oid, o.status, o.created_at, o.walkin_name FROM "order" o WHERE o.oid=$1 AND o.owner_uid=$2`,
        [r2, ownerUid])
      if (!order) return [404, { error: 'Order not found' }]
      return [200, order]
    }
  }


  if (r0 === 'stock') {
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]
    if (method === 'GET') {
      const rows = await dbq(
        `SELECT pid, SUM(qty) AS qty FROM product_stock WHERE owner_uid=$1 GROUP BY pid`,
        [user.uid])
      return [200, rows]
    }
  }

  // ── FORECAST ─────────────────────────────────────────────────────────────
  if (r0 === 'forecast') {
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]
    if (method === 'GET') {
      const rows = await dbq(
        `SELECT pid, tg, ts, td, tf, series, period_start, period_end
         FROM product_forecast WHERE owner_uid=$1`, [user.uid])
      const map = {}
      rows.forEach(r => { map[r.pid] = { ...r, series: r.series || [] } })
      return [200, map]
    }
    if (method === 'POST') {
      // Run forecast computation
      await runForecast(user.uid)
      const rows = await dbq(
        `SELECT pid, tg, ts, td, tf, series, period_start, period_end
         FROM product_forecast WHERE owner_uid=$1`, [user.uid])
      const map = {}
      rows.forEach(r => { map[r.pid] = { ...r, series: r.series || [] } })
      return [200, map]
    }
  }

  // ── REPORTS ───────────────────────────────────────────────────────────────
  if (r0 === 'reports') {
    if (!user?.is_manufacturer) return [403, { error: 'Manufacturers only' }]

    // GET /reports/sales?period=week|month|year
    if (r1 === 'sales' && method === 'GET') {
      const period = segments[2] || 'week'
      const intervals = { week:'7 days', month:'30 days', year:'365 days' }
      const interval = intervals[period] || '7 days'
      // qty in order_item is stored in MOQ subunits when allow_submultiples=true
      // Convert back to full units using moq for revenue calc: revenue = price * (qty * moq / conversion)
      // But price is per full unit. Simple: revenue = oi.price * oi.qty (price was stored per MOQ unit already)
      const rows = await dbq(`
        SELECT DATE(o.created_at) AS day,
               SUM(oi.price * oi.qty) AS revenue
        FROM "order" o
        JOIN order_item oi ON oi.oid = o.oid
        JOIN menu m ON m.mid = o.mid
        WHERE m.owner_uid = $1
          AND o.status NOT IN ('Declined','Cancelled')
          AND o.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE(o.created_at)
        ORDER BY day ASC`, [user.uid])
      return [200, rows]
    }

    // GET /reports/abc
    if (r1 === 'abc' && method === 'GET') {
      // ABC by revenue contribution
      const items = await dbq(`
        SELECT r.rid, r.name,
               SUM(oi.qty * oi.price) AS revenue,
               COUNT(DISTINCT o.oid) AS order_count,
               STDDEV(oi.qty * oi.price) AS revenue_stddev,
               AVG(oi.qty * oi.price) AS revenue_avg
        FROM order_item oi
        JOIN recipe r ON r.rid = oi.rid
        JOIN "order" o ON o.oid = oi.oid
        JOIN menu m ON m.mid = o.mid
        WHERE m.owner_uid = $1
          AND o.status NOT IN ('Declined','Cancelled')
          AND o.created_at >= NOW() - INTERVAL '365 days'
        GROUP BY r.rid, r.name
        ORDER BY revenue DESC`, [user.uid])

      // ABC classification: A=top 80%, B=next 15%, C=bottom 5%
      const total = items.reduce((s, r) => s + Number(r.revenue), 0)
      let cumulative = 0
      const classified = items.map(r => {
        cumulative += Number(r.revenue)
        const pct = total > 0 ? cumulative / total : 0
        const abc = pct <= 0.8 ? 'A' : pct <= 0.95 ? 'B' : 'C'
        // XYZ: coefficient of variation — X(stable)<0.5, Y(variable)0.5-1, Z(erratic)>1
        const cv = r.revenue_avg > 0 ? Number(r.revenue_stddev||0) / Number(r.revenue_avg) : 0
        const xyz = cv < 0.5 ? 'X' : cv < 1 ? 'Y' : 'Z'
        return { ...r, revenue: Number(r.revenue), abc, xyz, cv: Math.round(cv*100)/100 }
      })

      // Association rules (basket analysis) — orders as transactions
      const orderItems = await dbq(`
        SELECT o.oid, r.name AS item
        FROM order_item oi
        JOIN recipe r ON r.rid = oi.rid
        JOIN "order" o ON o.oid = oi.oid
        JOIN menu m ON m.mid = o.mid
        WHERE m.owner_uid = $1
          AND o.status NOT IN ('Declined','Cancelled')
          AND o.created_at >= NOW() - INTERVAL '365 days'
        ORDER BY o.oid, r.name`, [user.uid])

      // Group by order → transactions
      const transactions = {}
      orderItems.forEach(({ oid, item }) => {
        if (!transactions[oid]) transactions[oid] = new Set()
        transactions[oid].add(item)
      })
      const txList = Object.values(transactions).map(s => [...s])
      const nTx = txList.length
      const rules = []

      if (nTx >= 5) {
        // Find all items with support >= 0.05
        const itemFreq = {}
        txList.forEach(tx => tx.forEach(item => { itemFreq[item] = (itemFreq[item]||0)+1 }))
        const freqItems = Object.keys(itemFreq).filter(i => itemFreq[i]/nTx >= 0.05)

        // Generate 2-item association rules
        for (let i = 0; i < freqItems.length; i++) {
          for (let j = i+1; j < freqItems.length; j++) {
            const a = freqItems[i], b = freqItems[j]
            const both = txList.filter(tx => tx.includes(a) && tx.includes(b)).length
            const supp = both / nTx
            if (supp < 0.05) continue
            const confAB = both / itemFreq[a]
            const confBA = both / itemFreq[b]
            if (confAB >= 0.2) rules.push({ antecedent:a, consequent:b, support:supp, confidence:confAB, lift:confAB/(itemFreq[b]/nTx) })
            if (confBA >= 0.2) rules.push({ antecedent:b, consequent:a, support:supp, confidence:confBA, lift:confBA/(itemFreq[a]/nTx) })
          }
        }
        rules.sort((a,b) => b.confidence - a.confidence)
      }

      return [200, { items: classified, rules: rules.slice(0,10) }]
    }
  }

  return [404, { error: 'Not found' }]
}

// ─── SYNC DRAFT ORDERS FROM FORECAST ─────────────────────────────────────────
async function syncDraftOrders(ownerUid) {
  // Get current forecast deficits per product
  const forecasts = await dbq(
    `SELECT pid, tg FROM product_forecast WHERE owner_uid=$1 AND tg < 0`, [ownerUid])
  if (!forecasts.length) {
    // No deficits — delete all existing Draft orders
    await dbr(`DELETE FROM supplier_order_item WHERE soid IN (
      SELECT soid FROM supplier_order WHERE owner_uid=$1 AND status='New')`, [ownerUid])
    await dbr(`DELETE FROM supplier_order WHERE owner_uid=$1 AND status='New'`, [ownerUid])
    return
  }

  // Group deficit products by cheapest supplier
  const supplierGroups = {} // sid → [{pid, qty_needed, unit_price, currency}]
  for (const { pid, tg } of forecasts) {
    const qtyNeeded = Math.abs(Number(tg))
    // Find cheapest supplier link for this product
    const links = await dbq(`
      SELECT ps.sid, ps.price, ps.currency FROM product_supplier ps
      JOIN supplier s ON s.sid=ps.sid
      WHERE ps.pid=$1 AND s.owner_uid=$2
      ORDER BY ps.price ASC NULLS LAST LIMIT 1`, [pid, ownerUid])
    if (!links.length) continue
    const { sid, price, currency } = links[0]
    if (!supplierGroups[sid]) supplierGroups[sid] = []
    supplierGroups[sid].push({ pid, qty_needed: qtyNeeded, unit_price: price||0, currency: currency||'AMD' })
  }

  // Get or create a Draft order per supplier
  for (const [sid, items] of Object.entries(supplierGroups)) {
    const [existing] = await dbq(
      `SELECT soid FROM supplier_order WHERE owner_uid=$1 AND sid=$2 AND status='New'`,
      [ownerUid, sid])

    if (existing) {
      // Update existing draft items
      await dbr('DELETE FROM supplier_order_item WHERE soid=$1', [existing.soid])
      for (const it of items) {
        await dbr(`INSERT INTO supplier_order_item (soid,pid,qty_ordered,unit_price,currency)
          VALUES ($1,$2,$3,$4,$5)`, [existing.soid, it.pid, it.qty_needed, it.unit_price, it.currency])
      }
    } else {
      // Create new Draft order
      const sup = (await dbq('SELECT * FROM supplier WHERE sid=$1', [sid]))[0]
      // Pick cheapest delivery term
      const terms = sup?.schedule?.delivery || []
      const term = terms.sort((a,b)=>(a.days_before??99)-(b.days_before??99))[0]
      const now = new Date()
      const mm = String(now.getMinutes()).padStart(2,'0')
      // Simple order_id for draft
      const [{ count }] = await dbq('SELECT COUNT(*) AS count FROM supplier_order WHERE owner_uid=$1', [ownerUid])
      const seq = parseInt(count)+1
      const words = sup.name.trim().split(/\s+/)
      const initials = words.length===1 ? sup.name.slice(0,2).toUpperCase() : (words[0][0]+words[1][0]).toUpperCase()
      const orderId = `${seq}-${initials}-${mm}`
      const res = await dbr(`INSERT INTO supplier_order
        (owner_uid,sid,order_id,status,delivery_term,delivery_fee,currency)
        VALUES ($1,$2,$3,'New',$4,0,$5) RETURNING soid`,
        [ownerUid, sid, orderId, term?.name||null, 'AMD'])
      const soid = res.rows[0].soid
      for (const it of items) {
        await dbr(`INSERT INTO supplier_order_item (soid,pid,qty_ordered,unit_price,currency)
          VALUES ($1,$2,$3,$4,$5)`, [soid, it.pid, it.qty_needed, it.unit_price, it.currency])
      }
    }
  }

  // Delete Draft orders for suppliers that no longer have deficit products
  const activeSids = Object.keys(supplierGroups).map(Number)
  const allDrafts = await dbq(
    `SELECT soid, sid FROM supplier_order WHERE owner_uid=$1 AND status='New'`, [ownerUid])
  for (const draft of allDrafts) {
    if (!activeSids.includes(Number(draft.sid))) {
      await dbr('DELETE FROM supplier_order_item WHERE soid=$1', [draft.soid])
      await dbr('DELETE FROM supplier_order WHERE soid=$1', [draft.soid])
    }
  }
}
async function runForecast(ownerUid) {
  const now = new Date()
  const periodStart = new Date(now); periodStart.setHours(8,0,0,0)
  const periodEnd   = new Date(periodStart); periodEnd.setDate(periodEnd.getDate() + 7)

  // Get all products for this user's menus
  const products = await dbq(`
    SELECT DISTINCT rp.pid
    FROM recipe_product rp
    JOIN recipe r ON r.rid=rp.rid
    JOIN menu_recipe mr ON mr.rid=r.rid
    JOIN menu m ON m.mid=mr.mid
    WHERE m.owner_uid=$1 AND r.deleted=false`, [ownerUid])

  for (const { pid } of products) {
    // ── TS: current stock ──────────────────────────────────────────────────
    const [stockRow] = await dbq(
      `SELECT COALESCE(SUM(qty),0) AS ts FROM product_stock WHERE pid=$1 AND owner_uid=$2`,
      [pid, ownerUid])
    const ts = Number(stockRow?.ts || 0)

    // ── TD: qty in submitted supplier orders due within forecast period ────
    const tdRows = await dbq(`
      SELECT COALESCE(SUM(soi.qty_ordered),0) AS td
      FROM supplier_order_item soi
      JOIN supplier_order so ON so.soid=soi.soid
      WHERE soi.pid=$1 AND so.owner_uid=$2
        AND so.status='Submitted'
        AND so.etd IS NOT NULL
        AND so.etd >= $3 AND so.etd <= $4`,
      [pid, ownerUid, periodStart.toISOString().split('T')[0], periodEnd.toISOString().split('T')[0]])
    const td = Number(tdRows[0]?.td || 0)

    // ── TF: forecast demand using order history ────────────────────────────
    // Get daily sales (qty of this product consumed via menu orders) for last 90 days
    const salesRows = await dbq(`
      SELECT DATE(o.created_at) AS day, SUM(oi.qty * rp.qty) AS consumed
      FROM order_item oi
      JOIN recipe_product rp ON rp.rid=oi.rid AND rp.pid=$1
      JOIN "order" o ON o.oid=oi.oid
      JOIN menu m ON m.mid=o.mid
      WHERE m.owner_uid=$2
        AND o.created_at >= NOW() - INTERVAL '90 days'
        AND o.status NOT IN ('Declined','Cancelled')
      GROUP BY DATE(o.created_at)
      ORDER BY day`, [pid, ownerUid])

    let tfSeries = []
    if (salesRows.length >= 30) {
      // ARIMA: fit on training data, forecast 7 days
      tfSeries = arimaForecast(salesRows.map(r => Number(r.consumed)), 7)
    } else if (salesRows.length > 0) {
      // Weekly mean fallback
      const meanDaily = salesRows.reduce((s,r)=>s+Number(r.consumed),0) / salesRows.length
      tfSeries = Array(7).fill(meanDaily)
    } else {
      tfSeries = Array(7).fill(0)
    }
    const tf = tfSeries.reduce((a,b)=>a+b, 0)

    // ── TG series: daily grand total over 7-day period ─────────────────────
    const tg = td + ts - tf
    const series = tfSeries.map((f,i) => {
      const dayTD = i === 0 ? td : 0  // delivery arrives on first day
      return dayTD + ts - f
    })

    await dbq(`
      INSERT INTO product_forecast (pid, owner_uid, tg, ts, td, tf, series, period_start, period_end)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (pid, owner_uid) DO UPDATE
        SET tg=$3,ts=$4,td=$5,tf=$6,series=$7,period_start=$8,period_end=$9,computed_at=NOW()`,
      [pid, ownerUid, tg, ts, td, tf, JSON.stringify(series),
       periodStart.toISOString(), periodEnd.toISOString()])
  }
}

// Simple ARIMA(1,1,1) in JS — fits on series, returns h-step forecast
function arimaForecast(series, h) {
  if (series.length < 3) return Array(h).fill(series[0]||0)
  // Difference once
  const diff = series.slice(1).map((v,i)=>v-series[i])
  // Estimate AR(1) coefficient via Yule-Walker
  const n = diff.length
  const mean = diff.reduce((a,b)=>a+b,0)/n
  const c = diff.map(v=>v-mean)
  const r0 = c.reduce((a,v)=>a+v*v,0)/n
  const r1 = c.slice(1).reduce((a,v,i)=>a+v*c[i],0)/(n-1)
  const phi = r0>0 ? Math.max(-0.99,Math.min(0.99, r1/r0)) : 0
  // Residuals and MA(1)
  const resid = c.map((v,i)=>i===0?0:v-phi*c[i-1])
  const theta = -0.3 // fixed MA coefficient
  // Forecast in differenced space
  let last = diff[diff.length-1] - mean
  let lastRes = resid[resid.length-1]
  const forecast = []
  for (let i=0;i<h;i++) {
    const next = mean + phi*last + theta*lastRes
    forecast.push(next)
    lastRes = 0 // future innovations = 0
    last = next
  }
  // Un-difference: start from last original value
  const result = []
  let prev = series[series.length-1]
  for (const f of forecast) {
    prev = prev + f
    result.push(Math.max(0, prev))
  }
  return result
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
