// server/routes/products.js
import { Router } from 'express'
import { query, run } from '../db.js'
import { requireManufacturer } from '../auth.js'

const router = Router()

// GET /api/products
router.get('/', requireManufacturer, async (req, res) => {
  try {
    const rows = await query(`
      SELECT p.pid, p.name, p.deleted,
             u.name AS units, u.unid,
             c.name AS category, c.caid
      FROM product p
      LEFT JOIN units u ON u.unid = p.unid
      LEFT JOIN product_category c ON c.caid = p.caid
      WHERE p.deleted = false
      ORDER BY p.name
    `)
    res.json(rows)
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

// GET /api/products/lookups  (units + categories)
router.get('/lookups', requireManufacturer, async (req, res) => {
  try {
    const units = await query(`SELECT * FROM units ORDER BY name`)
    const categories = await query(`SELECT * FROM product_category ORDER BY name`)
    res.json({ units, categories })
  } catch (err) {
    res.status(500).json({ error: 'Failed' })
  }
})

// POST /api/products
router.post('/', requireManufacturer, async (req, res) => {
  try {
    const { name, unid, caid } = req.body
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' })
    await run(`INSERT INTO product (name, unid, caid) VALUES (?, ?, ?)`,
      [name.trim(), unid || null, caid || null])
    const [row] = await query(`
      SELECT p.pid, p.name, u.name AS units, u.unid, c.name AS category, c.caid
      FROM product p
      LEFT JOIN units u ON u.unid = p.unid
      LEFT JOIN product_category c ON c.caid = p.caid
      WHERE p.name = ? ORDER BY p.pid DESC LIMIT 1`, [name.trim()])
    res.status(201).json(row)
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

// DELETE /api/products  (bulk)
router.delete('/', requireManufacturer, async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: 'ids required' })
    for (const id of ids) {
      await run(`UPDATE product SET deleted = true WHERE pid = ?`, [id])
    }
    res.json({ deleted: ids })
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

export default router
