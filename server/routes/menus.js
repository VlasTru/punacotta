// server/routes/menus.js
import { Router } from 'express'
import { query, run } from '../db.js'
import { requireManufacturer, requireAuth } from '../auth.js'

const router = Router()

async function fetchMenuWithRecipes(mid) {
  const [menu] = await query(`SELECT * FROM menu WHERE mid = ?`, [mid])
  if (!menu) return null
  const recipes = await query(`
    SELECT r.rid, r.name, r.description, r.price, r.currency,
           c.name AS category
    FROM menu_recipe mr
    JOIN recipe r ON r.rid = mr.rid
    LEFT JOIN recipe_category c ON c.caid = r.caid
    WHERE mr.mid = ?
    ORDER BY c.name, r.name
  `, [mid])
  return { ...menu, recipes }
}

// GET /api/menus  – manufacturer sees all their menus; customers see available ones
router.get('/', requireAuth, async (req, res) => {
  try {
    let rows
    if (req.user.is_manufacturer) {
      rows = await query(`SELECT * FROM menu WHERE owner_uid = ? ORDER BY mid`, [req.user.uid])
    } else {
      rows = await query(`SELECT * FROM menu WHERE available = true ORDER BY mid`)
    }
    // Attach recipes to each menu
    const menus = await Promise.all(rows.map(m => fetchMenuWithRecipes(m.mid)))
    res.json(menus)
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

// GET /api/menus/:mid
router.get('/:mid', requireAuth, async (req, res) => {
  try {
    const menu = await fetchMenuWithRecipes(req.params.mid)
    if (!menu) return res.status(404).json({ error: 'Not found' })
    res.json(menu)
  } catch (err) {
    res.status(500).json({ error: 'Failed' })
  }
})

// POST /api/menus
router.post('/', requireManufacturer, async (req, res) => {
  try {
    const { name, available, delivery_fee, recipe_ids } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' })

    await run(
      `INSERT INTO menu (name, available, delivery_fee, owner_uid) VALUES (?, ?, ?, ?)`,
      [name.trim(), !!available, Number(delivery_fee) || 0, req.user.uid]
    )
    const [menu] = await query(`SELECT * FROM menu WHERE name = ? ORDER BY mid DESC LIMIT 1`, [name.trim()])

    if (Array.isArray(recipe_ids)) {
      for (const rid of recipe_ids) {
        await run(`INSERT OR IGNORE INTO menu_recipe (mid, rid) VALUES (?, ?)`, [menu.mid, rid])
      }
    }
    res.status(201).json(await fetchMenuWithRecipes(menu.mid))
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

// PATCH /api/menus/:mid
router.patch('/:mid', requireManufacturer, async (req, res) => {
  try {
    const { name, available, delivery_fee } = req.body
    if (name !== undefined)
      await run(`UPDATE menu SET name = ? WHERE mid = ?`, [name.trim(), req.params.mid])
    if (available !== undefined)
      await run(`UPDATE menu SET available = ? WHERE mid = ?`, [!!available, req.params.mid])
    if (delivery_fee !== undefined)
      await run(`UPDATE menu SET delivery_fee = ? WHERE mid = ?`, [Number(delivery_fee), req.params.mid])
    res.json(await fetchMenuWithRecipes(req.params.mid))
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

// POST /api/menus/:mid/recipes  – add recipes to menu
router.post('/:mid/recipes', requireManufacturer, async (req, res) => {
  try {
    const { recipe_ids } = req.body
    for (const rid of recipe_ids || []) {
      await run(`INSERT OR IGNORE INTO menu_recipe (mid, rid) VALUES (?, ?)`, [req.params.mid, rid])
    }
    res.json(await fetchMenuWithRecipes(req.params.mid))
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

// DELETE /api/menus/:mid/recipes  – remove recipes from menu
router.delete('/:mid/recipes', requireManufacturer, async (req, res) => {
  try {
    const { recipe_ids } = req.body
    for (const rid of recipe_ids || []) {
      await run(`DELETE FROM menu_recipe WHERE mid = ? AND rid = ?`, [req.params.mid, rid])
    }
    res.json(await fetchMenuWithRecipes(req.params.mid))
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

export default router
