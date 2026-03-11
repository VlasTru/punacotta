// api/auth/login.js  →  POST /api/auth/login
import bcrypt from 'bcryptjs'
import { query } from '../../lib/db.js'
import { signToken } from '../../lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { email, password } = req.body
    const [user] = await query('SELECT * FROM "user" WHERE email = $1', [email?.toLowerCase()])
    if (!user) return res.status(401).json({ error: 'Invalid email or password' })

    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) return res.status(401).json({ error: 'Invalid email or password' })

    const token = signToken({ uid: user.uid, email: user.email, is_manufacturer: user.is_manufacturer })
    const { password_hash, ...safeUser } = user
    res.json({ token, user: safeUser })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login failed' })
  }
}
