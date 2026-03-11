// api/auth/forgot.js  →  POST /api/auth/forgot
import { randomBytes } from 'crypto'
import { query, run } from '../../lib/db.js'
import { sendPasswordReset } from '../../lib/mail.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { email } = req.body
    const [user] = await query('SELECT * FROM "user" WHERE email = $1', [email?.toLowerCase()])
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' })

    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3_600_000)
    await run(
      `INSERT INTO auth_token (uid, token, purpose, expires_at) VALUES ($1,$2,'reset',$3)`,
      [user.uid, token, expires]
    )
    await sendPasswordReset(user, token)
    res.json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Request failed' })
  }
}
