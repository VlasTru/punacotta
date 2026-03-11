// server/routes/auth.js
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { query, run } from '../db.js'
import { signToken, requireAuth } from '../auth.js'
import { sendVerification, sendPasswordReset } from '../mail.js'

const router = Router()

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { first_name, last_name, email, phone, street_address, city, zip,
            password, is_manufacturer, business_name } = req.body

    if (!first_name || !last_name || !email || !password)
      return res.status(400).json({ error: 'Missing required fields' })

    if (password.trim().length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const existing = await query(`SELECT uid FROM "user" WHERE email = ?`, [email.toLowerCase()])
    if (existing.length > 0)
      return res.status(409).json({ error: 'A username with this email already exists. Please, login.' })

    const hash = await bcrypt.hash(password.trim(), 10)
    await run(`
      INSERT INTO "user" (first_name, last_name, email, phone, street_address, city, zip,
                          password_hash, is_manufacturer, business_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [first_name, last_name, email.toLowerCase(), phone || null,
       street_address || null, city || null, zip || null,
       hash, !!is_manufacturer, is_manufacturer ? (business_name || null) : null]
    )

    const [user] = await query(`SELECT * FROM "user" WHERE email = ?`, [email.toLowerCase()])

    // Create verification token
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600_000).toISOString()
    await run(`INSERT INTO auth_token (uid, token, purpose, expires_at) VALUES (?, ?, 'verify', ?)`,
      [user.uid, token, expires])

    await sendVerification(user, token)

    res.status(201).json({ message: 'Please check your email to find a welcome message.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Registration failed' })
  }
})

// POST /api/auth/verify/:token
router.post('/verify/:token', async (req, res) => {
  try {
    const [row] = await query(
      `SELECT * FROM auth_token WHERE token = ? AND purpose = 'verify' AND used = false AND expires_at > now()`,
      [req.params.token]
    )
    if (!row) return res.status(400).json({ error: 'Invalid or expired link' })

    await run(`UPDATE "user" SET email_verified = true WHERE uid = ?`, [row.uid])
    await run(`UPDATE auth_token SET used = true WHERE tid = ?`, [row.tid])

    const [user] = await query(`SELECT * FROM "user" WHERE uid = ?`, [row.uid])
    const jwt = signToken({ uid: user.uid, email: user.email, is_manufacturer: user.is_manufacturer })
    res.json({ token: jwt, user: safeUser(user) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Verification failed' })
  }
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const [user] = await query(`SELECT * FROM "user" WHERE email = ?`, [email?.toLowerCase()])
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ error: 'Invalid email or password' })

    // In dev, skip email verification gate
    const jwt = signToken({ uid: user.uid, email: user.email, is_manufacturer: user.is_manufacturer })
    res.json({ token: jwt, user: safeUser(user) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login failed' })
  }
})

// POST /api/auth/forgot
router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body
    const [user] = await query(`SELECT * FROM "user" WHERE email = ?`, [email?.toLowerCase()])
    // Always respond 200 to prevent email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' })

    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600_000).toISOString()
    await run(`INSERT INTO auth_token (uid, token, purpose, expires_at) VALUES (?, ?, 'reset', ?)`,
      [user.uid, token, expires])
    await sendPasswordReset(user, token)

    res.json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Request failed' })
  }
})

// POST /api/auth/reset/:token
router.post('/reset/:token', async (req, res) => {
  try {
    const { password } = req.body
    if (!password || password.trim().length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const [row] = await query(
      `SELECT * FROM auth_token WHERE token = ? AND purpose = 'reset' AND used = false AND expires_at > now()`,
      [req.params.token]
    )
    if (!row) return res.status(400).json({ error: 'Invalid or expired link' })

    const hash = await bcrypt.hash(password.trim(), 10)
    await run(`UPDATE "user" SET password_hash = ? WHERE uid = ?`, [hash, row.uid])
    await run(`UPDATE auth_token SET used = true WHERE tid = ?`, [row.tid])

    res.json({ message: 'Password updated. You can now log in.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Reset failed' })
  }
})

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const [user] = await query(`SELECT * FROM "user" WHERE uid = ?`, [req.user.uid])
    if (!user) return res.status(404).json({ error: 'Not found' })
    res.json(safeUser(user))
  } catch (err) {
    res.status(500).json({ error: 'Failed' })
  }
})

function safeUser(u) {
  const { password_hash, ...rest } = u
  return rest
}

export default router
