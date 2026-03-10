// server/routes/orders.js
import { Router } from 'express'
import { query, run } from '../db.js'
import { requireAuth, requireManufacturer } from '../auth.js'
import { sendOrderPlaced } from '../mail.js'

const router = Router()

const VALID_TRANSITIONS = {
  New: 'Accepted', Accepted: 'Preparing', Preparing: 'Done',
  Done: 'Dispatched', Dispatched: 'Delivered'
}

async function fetchOrder(oid) {
  const [order] = await query(`SELECT * FROM "order" WHERE oid = ?`, [oid])
  if (!order) return null
  const items = await query(`
    SELECT oi.oiid, oi.qty, oi.price, r.name, r.rid
    FROM order_item oi
    JOIN recipe r ON r.rid = oi.rid
    WHERE oi.oid = ?`, [oid])
  const [customer] = await query(`SELECT uid, first_name, last_name, email FROM "user" WHERE uid = ?`, [order.owner_uid])
  return { ...order, items, customer }
}

// GET /api/orders  – manufacturer: all orders; customer: own orders
router.get('/', requireAuth, async (req, res) => {
  try {
    let rows
    if (req.user.is_manufacturer) {
      // Get orders for menus owned by this manufacturer
      rows = await query(`
        SELECT o.oid FROM "order" o
        JOIN menu m ON m.mid = o.mid
        WHERE m.owner_uid = ?
        ORDER BY o.created_at DESC`, [req.user.uid])
    } else {
      rows = await query(`SELECT oid FROM "order" WHERE owner_uid = ? ORDER BY created_at DESC`, [req.user.uid])
    }
    const orders = await Promise.all(rows.map(r => fetchOrder(r.oid)))
    res.json(orders)
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

// POST /api/orders  – customer places an order
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.is_manufacturer)
      return res.status(403).json({ error: 'Manufacturers cannot place orders' })

    const { mid, pickup, items, delivery_address } = req.body
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'Order must have at least one item' })

    const [menu] = await query(`SELECT * FROM menu WHERE mid = ? AND available = true`, [mid])
    if (!menu) return res.status(400).json({ error: 'Menu not available' })

    // Verify all recipes exist in the menu
    for (const item of items) {
      const [mr] = await query(`SELECT 1 FROM menu_recipe WHERE mid = ? AND rid = ?`, [mid, item.rid])
      if (!mr) return res.status(400).json({ error: `Recipe ${item.rid} not in menu` })
    }

    await run(`
      INSERT INTO "order" (owner_uid, mid, pickup, delivery_address)
      VALUES (?, ?, ?, ?)`,
      [req.user.uid, mid, !!pickup, delivery_address || null])

    const [order] = await query(`SELECT * FROM "order" WHERE owner_uid = ? ORDER BY oid DESC LIMIT 1`, [req.user.uid])

    let oiid = Date.now()
    for (const item of items) {
      const [recipe] = await query(`SELECT price FROM recipe WHERE rid = ?`, [item.rid])
      await run(`INSERT INTO order_item (oiid, oid, rid, qty, price) VALUES (?, ?, ?, ?, ?)`,
        [oiid++, order.oid, item.rid, item.qty, recipe.price])
    }

    // Update customer address if delivery
    if (!pickup && delivery_address) {
      await run(`UPDATE "user" SET street_address = ? WHERE uid = ?`,
        [delivery_address, req.user.uid])
    }

    const full = await fetchOrder(order.oid)

    // Get manufacturer business name for email
    const [manuf] = await query(`SELECT business_name FROM "user" WHERE uid = ?`, [menu.owner_uid])
    const [customer] = await query(`SELECT * FROM "user" WHERE uid = ?`, [req.user.uid])
    await sendOrderPlaced(customer, order, manuf?.business_name || 'Pun&Cotta')

    res.status(201).json(full)
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed to place order' })
  }
})

// PATCH /api/orders/:oid/advance  – manufacturer advances status
router.patch('/:oid/advance', requireManufacturer, async (req, res) => {
  try {
    const [order] = await query(`SELECT * FROM "order" WHERE oid = ?`, [req.params.oid])
    if (!order) return res.status(404).json({ error: 'Not found' })

    const next = VALID_TRANSITIONS[order.status]
    if (!next) return res.status(400).json({ error: 'Cannot advance from this status' })

    await run(`UPDATE "order" SET status = ? WHERE oid = ?`, [next, req.params.oid])
    res.json(await fetchOrder(req.params.oid))
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

// PATCH /api/orders/:oid/decline  – manufacturer declines
router.patch('/:oid/decline', requireManufacturer, async (req, res) => {
  try {
    const [order] = await query(`SELECT * FROM "order" WHERE oid = ?`, [req.params.oid])
    if (!order) return res.status(404).json({ error: 'Not found' })
    if (['Declined','Delivered'].includes(order.status))
      return res.status(400).json({ error: 'Cannot decline from this status' })

    await run(`UPDATE "order" SET status = 'Declined' WHERE oid = ?`, [req.params.oid])
    res.json(await fetchOrder(req.params.oid))
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

// PATCH /api/orders/:oid/cancel  – customer cancels
router.patch('/:oid/cancel', requireAuth, async (req, res) => {
  try {
    const [order] = await query(`SELECT * FROM "order" WHERE oid = ? AND owner_uid = ?`,
      [req.params.oid, req.user.uid])
    if (!order) return res.status(404).json({ error: 'Not found' })
    if (['Declined','Delivered'].includes(order.status))
      return res.status(400).json({ error: 'Cannot cancel from this status' })

    await run(`UPDATE "order" SET status = 'Declined' WHERE oid = ?`, [req.params.oid])
    res.json(await fetchOrder(req.params.oid))
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

// PATCH /api/orders/:oid/confirm-delivery  – customer confirms receipt
router.patch('/:oid/confirm-delivery', requireAuth, async (req, res) => {
  try {
    const [order] = await query(`SELECT * FROM "order" WHERE oid = ? AND owner_uid = ?`,
      [req.params.oid, req.user.uid])
    if (!order) return res.status(404).json({ error: 'Not found' })
    if (!['Done','Dispatched'].includes(order.status))
      return res.status(400).json({ error: 'Cannot confirm delivery from this status' })

    await run(`UPDATE "order" SET status = 'Delivered' WHERE oid = ?`, [req.params.oid])
    res.json(await fetchOrder(req.params.oid))
  } catch (err) {
    console.error(err); res.status(500).json({ error: 'Failed' })
  }
})

export default router
