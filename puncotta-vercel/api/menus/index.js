// api/menus/index.js  →  GET / POST /api/menus
import { query, run } from '../../lib/db.js'
import { requireAuth, requireManufacturer } from '../../lib/auth.js'

async function fetchMenuWithRecipes(mid) {
  const [menu] = await query('SELECT * FROM menu WHERE mid = $1', [mid])
  if (!menu) return null
  const recipes = await query(`
    SELECT r.rid, r.name, r.description, r.price, r.currency,
           c.name AS category
    FROM menu_recipe mr
    JOIN recipe r ON r.rid = mr.rid
    LEFT JOIN recipe_category c ON c.caid = r.caid
    WHERE mr.mid = $1
    ORDER BY c.name, r.name
  `, [mid])
  return { ...menu, recipes }
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const user = requireAuth(req, res)
      if (!user) return

      let rows
      if (user.is_manufacturer) {
        rows = await query('SELECT mid FROM menu WHERE owner_uid = $1 ORDER BY mid', [user.uid])
      } else {
        rows = await query('SELECT mid FROM menu WHERE available = true ORDER BY mid')
      }
      const menus = await Promise.all(rows.map(r => fetchMenuWithRecipes(r.mid)))
      return res.json(menus)
    }

    if (req.method === 'POST') {
      const user = requireManufacturer(req, res)
      if (!user) return

      const { name, available, delivery_fee, recipe_ids } = req.body
      if (!name?.trim()) return res.status(400).json({ error: 'Name required' })

      const result = await run(
        `INSERT INTO menu (name, available, delivery_fee, owner_uid)
         VALUES ($1,$2,$3,$4) RETURNING mid`,
        [name.trim(), !!available, Number(delivery_fee) || 0, user.uid]
      )
      const mid = result.rows[0].mid

      if (Array.isArray(recipe_ids) && recipe_ids.length > 0) {
        for (const rid of recipe_ids) {
          await run(
            'INSERT INTO menu_recipe (mid, rid) VALUES ($1,$2) ON CONFLICT DO NOTHING',
            [mid, rid]
          )
        }
      }
      return res.status(201).json(await fetchMenuWithRecipes(mid))
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed' })
  }
}

export { fetchMenuWithRecipes }
