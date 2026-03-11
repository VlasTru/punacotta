// api/auth/verify.js  →  POST /api/auth/verify
// Body: { token }
import { query, run } from '../../lib/db.js'
import { signToken } from '../../lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { token } = req.body
    const [row] = await query(
      `SELECT * FROM auth_token
       WHERE token = $1 AND purpose = 'verify' AND used = false AND expires_at > now()`,
      [token]
    )
    if (!row) return res.status(400).json({ error: 'Invalid or expired link' })

    await run('UPDATE "user" SET email_verified = true WHERE uid = $1', [row.uid])
    await run('UPDATE auth_token SET used = true WHERE tid = $1', [row.tid])

    const [user] = await query('SELECT * FROM "user" WHERE uid = $1', [row.uid])
    const jwt = signToken({ uid: user.uid, email: user.email, is_manufacturer: user.is_manufacturer })
    const { password_hash, ...safeUser } = user
    res.json({ token: jwt, user: safeUser })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Verification failed' })
  }
}
