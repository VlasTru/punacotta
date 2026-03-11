// api/auth/reset.js  →  POST /api/auth/reset
// Body: { token, password }
import bcrypt from 'bcryptjs'
import { query, run } from '../../lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { token, password } = req.body
    if (!password || password.trim().length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' })

    const [row] = await query(
      `SELECT * FROM auth_token
       WHERE token = $1 AND purpose = 'reset' AND used = false AND expires_at > now()`,
      [token]
    )
    if (!row) return res.status(400).json({ error: 'Invalid or expired link' })

    const hash = await bcrypt.hash(password.trim(), 10)
    await run('UPDATE "user" SET password_hash = $1 WHERE uid = $2', [hash, row.uid])
    await run('UPDATE auth_token SET used = true WHERE tid = $1', [row.tid])

    res.json({ message: 'Password updated. You can now log in.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Reset failed' })
  }
}
