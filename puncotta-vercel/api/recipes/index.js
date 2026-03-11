// api/recipes/index.js  →  GET / POST / DELETE /api/recipes
import { query, run } from '../../lib/db.js'
import { requireManufacturer } from '../../lib/auth.js'

const RECIPE_SELECT = `
  SELECT r.rid, r.name, r.description, r.price, r.currency, r.available,
         u.name AS units, u.unid,
         c.name AS category, c.caid
  FROM recipe r
  LEFT JOIN units u ON u.unid = r.unid
  LEFT JOIN recipe_category c ON c.caid = r.caid
`

async function getRecipes(req, res) {
  const rows = await query(RECIPE_SELECT + ' WHERE r.deleted = false ORDER BY r.name')
  res.json(rows)
}

async function createRecipe(req, res) {
  const { name, description, unid, caid, price, currency, available } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' })

  const result = await run(
    `INSERT INTO recipe (name, description, unid, caid, price, currency, available)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING rid`,
    [name.trim(), description || null, unid || null, caid || null,
     Number(price) || 0, currency || 'AMD', available !== false]
  )
  const rid = result.rows[0].rid
  const [row] = await query(RECIPE_SELECT + ' WHERE r.rid = $1', [rid])
  res.status(201).json(row)
}

async function deleteRecipes(req, res) {
  const { ids } = req.body
  if (!Array.isArray(ids) || ids.length === 0)
    return res.status(400).json({ error: 'ids required' })
  await run('UPDATE recipe SET deleted = true WHERE rid = ANY($1::int[])', [ids])
  res.json({ deleted: ids })
}

export default async function handler(req, res) {
  const user = requireManufacturer(req, res)
  if (!user) return

  try {
    if (req.method === 'GET')    return await getRecipes(req, res)
    if (req.method === 'POST')   return await createRecipe(req, res)
    if (req.method === 'DELETE') return await deleteRecipes(req, res)
    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed' })
  }
}
