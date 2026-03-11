// api/recipes/available.js  →  GET /api/recipes/available (no auth – public)
import { query } from '../../lib/db.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const rows = await query(`
      SELECT r.rid, r.name, r.description, r.price, r.currency,
             u.name AS units, c.name AS category
      FROM recipe r
      LEFT JOIN units u ON u.unid = r.unid
      LEFT JOIN recipe_category c ON c.caid = r.caid
      WHERE r.deleted = false AND r.available = true
      ORDER BY r.name
    `)
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed' })
  }
}
