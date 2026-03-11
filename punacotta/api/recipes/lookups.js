// api/recipes/lookups.js  →  GET /api/recipes/lookups
import { query } from '../../lib/db.js'
import { requireManufacturer } from '../../lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  const user = requireManufacturer(req, res)
  if (!user) return
  try {
    const [units, categories] = await Promise.all([
      query('SELECT * FROM units ORDER BY name'),
      query('SELECT * FROM recipe_category ORDER BY name'),
    ])
    res.json({ units, categories })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed' })
  }
}
