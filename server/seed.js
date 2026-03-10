// server/seed.js  –  run once: node server/seed.js
import bcrypt from 'bcryptjs'
import { mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true })

import { getDb, query, run } from './db.js'
await getDb()

console.log('🌱 Seeding demo data...')

// Users
const custHash = await bcrypt.hash('pass123', 10)
const manufHash = await bcrypt.hash('pass123', 10)

await run(`DELETE FROM order_item`)
await run(`DELETE FROM "order"`)
await run(`DELETE FROM menu_recipe`)
await run(`DELETE FROM menu`)
await run(`DELETE FROM recipe`)
await run(`DELETE FROM product`)
await run(`DELETE FROM "user"`)

await run(`
  INSERT INTO "user" (first_name, last_name, email, phone, street_address, city, zip, password_hash, is_manufacturer, business_name, email_verified)
  VALUES ('Sophie', 'Martel', 'sophie@example.com', '+374 91 000001', '12 Abovyan St', 'Yerevan', '000001', ?, false, null, true)
`, [custHash])

await run(`
  INSERT INTO "user" (first_name, last_name, email, phone, street_address, city, zip, password_hash, is_manufacturer, business_name, email_verified)
  VALUES ('Arman', 'Grigoryan', 'arman@puncotta.com', '+374 91 000002', '5 Tigranyan St', 'Yerevan', '000002', ?, true, 'Pun&Cotta Bakery', true)
`, [manufHash])

// Units lookup IDs (already seeded by bootstrap)
const units = await query(`SELECT * FROM units`)
const u = Object.fromEntries(units.map(u => [u.name, u.unid]))

// Recipe categories
const rcats = await query(`SELECT * FROM recipe_category`)
const rc = Object.fromEntries(rcats.map(c => [c.name, c.caid]))

// Product categories
const pcats = await query(`SELECT * FROM product_category`)
const pc = Object.fromEntries(pcats.map(c => [c.name, c.caid]))

// Products
await run(`INSERT INTO product (name, unid, caid) VALUES ('Butter', ?, ?)`, [u['grams'], pc['dairy']])
await run(`INSERT INTO product (name, unid, caid) VALUES ('Flour', ?, ?)`, [u['kilograms'], null])
await run(`INSERT INTO product (name, unid, caid) VALUES ('Eggs', ?, ?)`, [u['pcs'], pc['poultry']])
await run(`INSERT INTO product (name, unid, caid) VALUES ('Sugar', ?, ?)`, [u['grams'], null])
await run(`INSERT INTO product (name, unid, caid) VALUES ('Cream', ?, ?)`, [u['litres'], pc['dairy']])
await run(`INSERT INTO product (name, unid, caid) VALUES ('Vanilla', ?, ?)`, [u['sachets'], null])

// Recipes
await run(`INSERT INTO recipe (name, description, unid, caid, price, currency, available) VALUES ('Panna Cotta', 'Classic Italian dessert', ?, ?, 1200, 'AMD', true)`, [u['pcs'], rc['desserts']])
await run(`INSERT INTO recipe (name, description, unid, caid, price, currency, available) VALUES ('Crème Brûlée', 'French custard classic', ?, ?, 1500, 'AMD', true)`, [u['pcs'], rc['desserts']])
await run(`INSERT INTO recipe (name, description, unid, caid, price, currency, available) VALUES ('Tiramisu', 'Italian coffee cake', ?, ?, 1800, 'AMD', true)`, [u['pcs'], rc['desserts']])
await run(`INSERT INTO recipe (name, description, unid, caid, price, currency, available) VALUES ('Espresso', 'Strong black coffee', ?, ?, 600, 'AMD', true)`, [u['pcs'], rc['hot drinks']])
await run(`INSERT INTO recipe (name, description, unid, caid, price, currency, available) VALUES ('Latte', 'Espresso with steamed milk', ?, ?, 800, 'AMD', true)`, [u['pcs'], rc['hot drinks']])
await run(`INSERT INTO recipe (name, description, unid, caid, price, currency, available) VALUES ('Bruschetta', 'Toasted bread with toppings', ?, ?, 900, 'AMD', false)`, [u['pcs'], rc['starters']])

const recipes = await query(`SELECT * FROM recipe`)
const r = Object.fromEntries(recipes.map(r => [r.name, r.rid]))
const [manuf] = await query(`SELECT uid FROM "user" WHERE is_manufacturer = true LIMIT 1`)

// Menus
await run(`INSERT INTO menu (name, available, delivery_fee, owner_uid) VALUES ('Spring 2024', true, 500, ?)`, [manuf.uid])
await run(`INSERT INTO menu (name, available, delivery_fee, owner_uid) VALUES ('Summer Specials', false, 300, ?)`, [manuf.uid])

const [menu1] = await query(`SELECT mid FROM menu WHERE name = 'Spring 2024'`)
await run(`INSERT INTO menu_recipe (mid, rid) VALUES (?, ?)`, [menu1.mid, r['Panna Cotta']])
await run(`INSERT INTO menu_recipe (mid, rid) VALUES (?, ?)`, [menu1.mid, r['Crème Brûlée']])
await run(`INSERT INTO menu_recipe (mid, rid) VALUES (?, ?)`, [menu1.mid, r['Espresso']])
await run(`INSERT INTO menu_recipe (mid, rid) VALUES (?, ?)`, [menu1.mid, r['Latte']])

// Sample orders
const [cust] = await query(`SELECT uid FROM "user" WHERE is_manufacturer = false LIMIT 1`)
await run(`INSERT INTO "order" (owner_uid, mid, pickup, status, created_at) VALUES (?, ?, false, 'New', now())`, [cust.uid, menu1.mid])
const [o1] = await query(`SELECT oid FROM "order" ORDER BY oid DESC LIMIT 1`)
await run(`INSERT INTO order_item (oiid, oid, rid, qty, price) VALUES (1, ?, ?, 2, 1200)`, [o1.oid, r['Panna Cotta']])
await run(`INSERT INTO order_item (oiid, oid, rid, qty, price) VALUES (2, ?, ?, 1, 600)`, [o1.oid, r['Espresso']])

await run(`INSERT INTO "order" (owner_uid, mid, pickup, status, created_at) VALUES (?, ?, true, 'Accepted', now())`, [cust.uid, menu1.mid])
const [o2] = await query(`SELECT oid FROM "order" ORDER BY oid DESC LIMIT 1`)
await run(`INSERT INTO order_item (oiid, oid, rid, qty, price) VALUES (3, ?, ?, 1, 1800)`, [o2.oid, r['Tiramisu']])

console.log('✅ Seed complete!')
console.log('   Customer:     sophie@example.com / pass123')
console.log('   Manufacturer: arman@puncotta.com / pass123')
process.exit(0)
