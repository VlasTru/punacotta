// api/auth/me.js  →  GET /api/auth/me
import { query } from '../../lib/db.js'
import { requireAuth } from '../../lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = requireAuth(req, res)
  if (!user) return

  try {
    const [row] = await query('SELECT * FROM "user" WHERE uid = $1', [user.uid])
    if (!row) return res.status(404).json({ error: 'Not found' })
    const { password_hash, ...safe } = row
    res.json(safe)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed' })
  }
}
