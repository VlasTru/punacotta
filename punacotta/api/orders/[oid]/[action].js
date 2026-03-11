// api/orders/[oid]/[action].js
// Handles: advance | decline | cancel | confirm-delivery
import { query, run } from '../../../lib/db.js'
import { requireAuth, requireManufacturer } from '../../../lib/auth.js'

const TRANSITIONS = {
  New: 'Accepted', Accepted: 'Preparing', Preparing: 'Done',
  Done: 'Dispatched', Dispatched: 'Delivered'
}

async function fetchOrder(oid) {
  const [order] = await query('SELECT * FROM "order" WHERE oid = $1', [oid])
  if (!order) return null
  const items = await query(`
    SELECT oi.oiid, oi.qty, oi.price, r.name, r.rid
    FROM order_item oi JOIN recipe r ON r.rid = oi.rid
    WHERE oi.oid = $1`, [oid])
  const [customer] = await query(
    'SELECT uid, first_name, last_name, email FROM "user" WHERE uid = $1',
    [order.owner_uid]
  )
  return { ...order, items, customer }
}

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' })

  const { oid, action } = req.query

  try {
    // advance — manufacturer only
    if (action === 'advance') {
      const user = requireManufacturer(req, res)
      if (!user) return
      const [order] = await query('SELECT * FROM "order" WHERE oid = $1', [oid])
      if (!order) return res.status(404).json({ error: 'Not found' })
      const next = TRANSITIONS[order.status]
      if (!next) return res.status(400).json({ error: 'Cannot advance from this status' })
      await run('UPDATE "order" SET status = $1 WHERE oid = $2', [next, oid])
      return res.json(await fetchOrder(oid))
    }

    // decline — manufacturer only
    if (action === 'decline') {
      const user = requireManufacturer(req, res)
      if (!user) return
      const [order] = await query('SELECT * FROM "order" WHERE oid = $1', [oid])
      if (!order) return res.status(404).json({ error: 'Not found' })
      if (['Declined', 'Delivered'].includes(order.status))
        return res.status(400).json({ error: 'Cannot decline from this status' })
      await run("UPDATE \"order\" SET status = 'Declined' WHERE oid = $1", [oid])
      return res.json(await fetchOrder(oid))
    }

    // cancel — customer only
    if (action === 'cancel') {
      const user = requireAuth(req, res)
      if (!user) return
      const [order] = await query(
        'SELECT * FROM "order" WHERE oid = $1 AND owner_uid = $2', [oid, user.uid]
      )
      if (!order) return res.status(404).json({ error: 'Not found' })
      if (['Declined', 'Delivered'].includes(order.status))
        return res.status(400).json({ error: 'Cannot cancel from this status' })
      await run("UPDATE \"order\" SET status = 'Declined' WHERE oid = $1", [oid])
      return res.json(await fetchOrder(oid))
    }

    // confirm-delivery — customer only
    if (action === 'confirm-delivery') {
      const user = requireAuth(req, res)
      if (!user) return
      const [order] = await query(
        'SELECT * FROM "order" WHERE oid = $1 AND owner_uid = $2', [oid, user.uid]
      )
      if (!order) return res.status(404).json({ error: 'Not found' })
      if (!['Done', 'Dispatched'].includes(order.status))
        return res.status(400).json({ error: 'Cannot confirm delivery from this status' })
      await run("UPDATE \"order\" SET status = 'Delivered' WHERE oid = $1", [oid])
      return res.json(await fetchOrder(oid))
    }

    res.status(400).json({ error: `Unknown action: ${action}` })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed' })
  }
}
