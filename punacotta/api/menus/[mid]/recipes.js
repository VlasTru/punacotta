// api/menus/[mid]/recipes.js  →  POST / DELETE /api/menus/:mid/recipes
import { query, run } from '../../../lib/db.js'
import { requireManufacturer } from '../../../lib/auth.js'

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
  const user = requireManufacturer(req, res)
  if (!user) return

  const { mid } = req.query

  try {
    if (req.method === 'POST') {
      const { recipe_ids } = req.body
      for (const rid of recipe_ids || []) {
        await run(
          'INSERT INTO menu_recipe (mid, rid) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [mid, rid]
        )
      }
      return res.json(await fetchMenuWithRecipes(mid))
    }

    if (req.method === 'DELETE') {
      const { recipe_ids } = req.body
      for (const rid of recipe_ids || []) {
        await run('DELETE FROM menu_recipe WHERE mid = $1 AND rid = $2', [mid, rid])
      }
      return res.json(await fetchMenuWithRecipes(mid))
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed' })
  }
}
