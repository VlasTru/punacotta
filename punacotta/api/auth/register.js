// api/auth/register.js  →  POST /api/auth/register
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'
import { query, run } from '../../lib/db.js'
import { sendVerification } from '../../lib/mail.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { first_name, last_name, email, phone, street_address, city, zip,
            password, is_manufacturer, business_name } = req.body

    if (!first_name || !last_name || !email || !password)
      return res.status(400).json({ error: 'Missing required fields' })
    if (password.trim().length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const existing = await query('SELECT uid FROM "user" WHERE email = $1', [email.toLowerCase()])
    if (existing.length > 0)
      return res.status(409).json({ error: 'A username with this email already exists. Please, login.' })

    const hash = await bcrypt.hash(password.trim(), 10)
    await run(
      `INSERT INTO "user" (first_name, last_name, email, phone, street_address, city, zip,
                           password_hash, is_manufacturer, business_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [first_name, last_name, email.toLowerCase(), phone || null,
       street_address || null, city || null, zip || null,
       hash, !!is_manufacturer, is_manufacturer ? (business_name || null) : null]
    )

    const [user] = await query('SELECT * FROM "user" WHERE email = $1', [email.toLowerCase()])
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3_600_000)
    await run(
      `INSERT INTO auth_token (uid, token, purpose, expires_at) VALUES ($1,$2,'verify',$3)`,
      [user.uid, token, expires]
    )
    await sendVerification(user, token)

    res.status(201).json({ message: 'Please check your email to find a welcome message.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Registration failed' })
  }
}
