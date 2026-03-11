// api/recipes/[rid].js  →  PATCH /api/recipes/:rid
import { query, run } from '../../lib/db.js'
import { requireManufacturer } from '../../lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })
  const user = requireManufacturer(req, res)
  if (!user) return

  const { rid } = req.query
  try {
    const { available } = req.body
    if (available !== undefined) {
      await run('UPDATE recipe SET available = $1 WHERE rid = $2', [!!available, rid])
    }
    const [row] = await query(`
      SELECT r.rid, r.name, r.description, r.price, r.currency, r.available,
             u.name AS units, c.name AS category
      FROM recipe r
      LEFT JOIN units u ON u.unid = r.unid
      LEFT JOIN recipe_category c ON c.caid = r.caid
      WHERE r.rid = $1`, [rid])
    res.json(row)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed' })
  }
}
