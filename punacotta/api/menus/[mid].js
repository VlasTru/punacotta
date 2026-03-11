// api/menus/[mid].js  →  GET / PATCH /api/menus/:mid
import { query, run } from '../../lib/db.js'
import { requireAuth, requireManufacturer } from '../../lib/auth.js'

async function fetchMenuWithRecipes(mid) {
  const [menu] = await query('SELECT * FROM menu WHERE mid = $1', [mid])
  if (!menu) return null
  const recipes = await query(`
    SELECT r.rid, r.name, r.description, r.price, r.currency, c.name AS category
    FROM menu_recipe mr
    JOIN recipe r ON r.rid = mr.rid
    LEFT JOIN recipe_category c ON c.caid = r.caid
    WHERE mr.mid = $1
    ORDER BY c.name, r.name
  `, [mid])
  return { ...menu, recipes }
}

export default async function handler(req, res) {
  const { mid } = req.query

  try {
    if (req.method === 'GET') {
      const user = requireAuth(req, res)
      if (!user) return
      const menu = await fetchMenuWithRecipes(mid)
      if (!menu) return res.status(404).json({ error: 'Not found' })
      return res.json(menu)
    }

    if (req.method === 'PATCH') {
      const user = requireManufacturer(req, res)
      if (!user) return
      const { name, available, delivery_fee } = req.body
      if (name !== undefined)
        await run('UPDATE menu SET name = $1 WHERE mid = $2', [name.trim(), mid])
      if (available !== undefined)
        await run('UPDATE menu SET available = $1 WHERE mid = $2', [!!available, mid])
      if (delivery_fee !== undefined)
        await run('UPDATE menu SET delivery_fee = $1 WHERE mid = $2', [Number(delivery_fee), mid])
      return res.json(await fetchMenuWithRecipes(mid))
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed' })
  }
}
