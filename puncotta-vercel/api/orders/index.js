// api/orders/index.js  →  GET / POST /api/orders
import { query, run } from '../../lib/db.js'
import { requireAuth } from '../../lib/auth.js'
import { sendOrderPlaced } from '../../lib/mail.js'

async function fetchOrder(oid) {
  const [order] = await query('SELECT * FROM "order" WHERE oid = $1', [oid])
  if (!order) return null
  const items = await query(`
    SELECT oi.oiid, oi.qty, oi.price, r.name, r.rid
    FROM order_item oi
    JOIN recipe r ON r.rid = oi.rid
    WHERE oi.oid = $1`, [oid])
  const [customer] = await query(
    'SELECT uid, first_name, last_name, email FROM "user" WHERE uid = $1',
    [order.owner_uid]
  )
  return { ...order, items, customer }
}

export default async function handler(req, res) {
  const user = requireAuth(req, res)
  if (!user) return

  try {
    if (req.method === 'GET') {
      let rows
      if (user.is_manufacturer) {
        rows = await query(`
          SELECT o.oid FROM "order" o
          JOIN menu m ON m.mid = o.mid
          WHERE m.owner_uid = $1
          ORDER BY o.created_at DESC`, [user.uid])
      } else {
        rows = await query(
          'SELECT oid FROM "order" WHERE owner_uid = $1 ORDER BY created_at DESC',
          [user.uid]
        )
      }
      const orders = await Promise.all(rows.map(r => fetchOrder(r.oid)))
      return res.json(orders)
    }

    if (req.method === 'POST') {
      if (user.is_manufacturer)
        return res.status(403).json({ error: 'Manufacturers cannot place orders' })

      const { mid, pickup, items, delivery_address } = req.body
      if (!Array.isArray(items) || items.length === 0)
        return res.status(400).json({ error: 'Order must have at least one item' })

      const [menu] = await query(
        'SELECT * FROM menu WHERE mid = $1 AND available = true', [mid]
      )
      if (!menu) return res.status(400).json({ error: 'Menu not available' })

      // Verify recipes belong to this menu
      for (const item of items) {
        const [mr] = await query(
          'SELECT 1 FROM menu_recipe WHERE mid = $1 AND rid = $2', [mid, item.rid]
        )
        if (!mr) return res.status(400).json({ error: `Recipe ${item.rid} not in menu` })
      }

      const result = await run(
        `INSERT INTO "order" (owner_uid, mid, pickup, delivery_address)
         VALUES ($1,$2,$3,$4) RETURNING oid`,
        [user.uid, mid, !!pickup, delivery_address || null]
      )
      const oid = result.rows[0].oid

      for (const item of items) {
        const [recipe] = await query('SELECT price FROM recipe WHERE rid = $1', [item.rid])
        await run(
          'INSERT INTO order_item (oid, rid, qty, price) VALUES ($1,$2,$3,$4)',
          [oid, item.rid, item.qty, recipe.price]
        )
      }

      if (!pickup && delivery_address) {
        await run(
          'UPDATE "user" SET street_address = $1 WHERE uid = $2',
          [delivery_address, user.uid]
        )
      }

      const full = await fetchOrder(oid)
      const [manuf] = await query(
        'SELECT business_name FROM "user" WHERE uid = $1', [menu.owner_uid]
      )
      const [customer] = await query('SELECT * FROM "user" WHERE uid = $1', [user.uid])
      await sendOrderPlaced(customer, { oid }, manuf?.business_name || 'Pun&Cotta')

      return res.status(201).json(full)
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed' })
  }
}
