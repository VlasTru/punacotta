// server/routes/recipes.js
import { Router } from 'express'
import { query, run } from '../db.js'
import { requireManufacturer } from '../auth.js'

const router = Router()

// GET /api/recipes
router.get('/', requireManufacturer, async (req, res) => {
  try {
    const rows = await query(`
      SELECT r.rid, r.name, r.description, r.price, r.currency, r.available, r.deleted,
             u.name AS units, u.unid,
             c.name AS category, c.caid
      FROM recipe r
      LEFT JOIN units u ON u.unid = r.unid
      LEFT JOIN recipe_category c ON c.caid = r.caid
      WHERE r.deleted = false
      ORDER BY r.name
    `)
    res.json(rows)
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

// GET /api/recipes/available  – for menu building & customer views
router.get('/available', async (req, res) => {
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
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

// GET /api/recipes/lookups
router.get('/lookups', requireManufacturer, async (req, res) => {
  try {
    const units = await query(`SELECT * FROM units ORDER BY name`)
    const categories = await query(`SELECT * FROM recipe_category ORDER BY name`)
    res.json({ units, categories })
  } catch (err) {
    res.status(500).json({ error: 'Failed' })
  }
})

// POST /api/recipes
router.post('/', requireManufacturer, async (req, res) => {
  try {
    const { name, description, unid, caid, price, currency, available } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' })
    await run(
      `INSERT INTO recipe (name, description, unid, caid, price, currency, available)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), description || null, unid || null, caid || null,
       Number(price) || 0, currency || 'AMD', available !== false]
    )
    const [row] = await query(`
      SELECT r.rid, r.name, r.description, r.price, r.currency, r.available,
             u.name AS units, c.name AS category
      FROM recipe r
      LEFT JOIN units u ON u.unid = r.unid
      LEFT JOIN recipe_category c ON c.caid = r.caid
      WHERE r.name = ? ORDER BY r.rid DESC LIMIT 1`, [name.trim()])
    res.status(201).json(row)
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

// PATCH /api/recipes/:rid
router.patch('/:rid', requireManufacturer, async (req, res) => {
  try {
    const { available } = req.body
    if (available !== undefined) {
      await run(`UPDATE recipe SET available = ? WHERE rid = ?`, [!!available, req.params.rid])
    }
    const [row] = await query(`
      SELECT r.rid, r.name, r.description, r.price, r.currency, r.available,
             u.name AS units, c.name AS category
      FROM recipe r
      LEFT JOIN units u ON u.unid = r.unid
      LEFT JOIN recipe_category c ON c.caid = r.caid
      WHERE r.rid = ?`, [req.params.rid])
    res.json(row)
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

// DELETE /api/recipes (bulk)
router.delete('/', requireManufacturer, async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: 'ids required' })
    for (const id of ids) {
      await run(`UPDATE recipe SET deleted = true WHERE rid = ?`, [id])
    }
    res.json({ deleted: ids })
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

export default router
