// api/products/index.js  →  GET / POST / DELETE /api/products
import { query, run } from '../../lib/db.js'
import { requireManufacturer } from '../../lib/auth.js'

async function getProducts(req, res) {
  const rows = await query(`
    SELECT p.pid, p.name,
           u.name AS units, u.unid,
           c.name AS category, c.caid
    FROM product p
    LEFT JOIN units u ON u.unid = p.unid
    LEFT JOIN product_category c ON c.caid = p.caid
    WHERE p.deleted = false
    ORDER BY p.name
  `)
  res.json(rows)
}

async function createProduct(req, res) {
  const { name, unid, caid } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name required' })

  const result = await run(
    `INSERT INTO product (name, unid, caid) VALUES ($1,$2,$3) RETURNING pid`,
    [name.trim(), unid || null, caid || null]
  )
  const pid = result.rows[0].pid
  const [row] = await query(`
    SELECT p.pid, p.name, u.name AS units, u.unid, c.name AS category, c.caid
    FROM product p
    LEFT JOIN units u ON u.unid = p.unid
    LEFT JOIN product_category c ON c.caid = p.caid
    WHERE p.pid = $1`, [pid])
  res.status(201).json(row)
}

async function deleteProducts(req, res) {
  const { ids } = req.body
  if (!Array.isArray(ids) || ids.length === 0)
    return res.status(400).json({ error: 'ids required' })
  await run(
    `UPDATE product SET deleted = true WHERE pid = ANY($1::int[])`,
    [ids]
  )
  res.json({ deleted: ids })
}

export default async function handler(req, res) {
  const user = requireManufacturer(req, res)
  if (!user) return

  try {
    if (req.method === 'GET')    return await getProducts(req, res)
    if (req.method === 'POST')   return await createProduct(req, res)
    if (req.method === 'DELETE') return await deleteProducts(req, res)
    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed' })
  }
}
