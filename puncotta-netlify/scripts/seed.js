// scripts/seed.js  –  run after migrate.js to load demo data
// Usage: DATABASE_URL=postgres://... node scripts/seed.js

import pg from 'pg'
import bcrypt from 'bcryptjs'

const { Client } = pg
const client = new Client({
  connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
})

await client.connect()
console.log('🌱 Seeding demo data...')

const q = (sql, p) => client.query(sql, p)

// Wipe existing demo data (safe to re-run)
await q(`DELETE FROM order_item`)
await q(`DELETE FROM "order"`)
await q(`DELETE FROM menu_recipe`)
await q(`DELETE FROM menu`)
await q(`DELETE FROM recipe`)
await q(`DELETE FROM product`)
await q(`DELETE FROM auth_token`)
await q(`DELETE FROM "user"`)
await q(`ALTER SEQUENCE user_uid_seq RESTART WITH 1`)
await q(`ALTER SEQUENCE recipe_rid_seq RESTART WITH 1`)
await q(`ALTER SEQUENCE menu_mid_seq RESTART WITH 1`)
await q(`ALTER SEQUENCE order_oid_seq RESTART WITH 1`)

const custHash  = await bcrypt.hash('pass123', 10)
const manufHash = await bcrypt.hash('pass123', 10)

await q(`
  INSERT INTO "user" (first_name,last_name,email,phone,street_address,city,zip,password_hash,is_manufacturer,business_name,email_verified)
  VALUES ('Sophie','Martel','sophie@example.com','+374 91 000001','12 Abovyan St','Yerevan','000001',$1,false,null,true)
`, [custHash])

await q(`
  INSERT INTO "user" (first_name,last_name,email,phone,street_address,city,zip,password_hash,is_manufacturer,business_name,email_verified)
  VALUES ('Arman','Grigoryan','arman@puncotta.com','+374 91 000002','5 Tigranyan St','Yerevan','000002',$1,true,'Pun&Cotta Bakery',true)
`, [manufHash])

// Get lookup IDs
const units = (await q(`SELECT unid, name FROM units`)).rows
const u = Object.fromEntries(units.map(r => [r.name, r.unid]))

const rcats = (await q(`SELECT caid, name FROM recipe_category`)).rows
const rc = Object.fromEntries(rcats.map(r => [r.name, r.caid]))

const pcats = (await q(`SELECT caid, name FROM product_category`)).rows
const pc = Object.fromEntries(pcats.map(r => [r.name, r.caid]))

// Products
await q(`INSERT INTO product (name,unid,caid) VALUES ('Butter',$1,$2)`,    [u.grams, pc.dairy])
await q(`INSERT INTO product (name,unid,caid) VALUES ('Flour',$1,$2)`,     [u.kilograms, null])
await q(`INSERT INTO product (name,unid,caid) VALUES ('Eggs',$1,$2)`,      [u.pcs, pc.poultry])
await q(`INSERT INTO product (name,unid,caid) VALUES ('Sugar',$1,$2)`,     [u.grams, null])
await q(`INSERT INTO product (name,unid,caid) VALUES ('Cream',$1,$2)`,     [u.litres, pc.dairy])
await q(`INSERT INTO product (name,unid,caid) VALUES ('Vanilla',$1,$2)`,   [u.sachets, null])

// Recipes
const ins = async (name, desc, currency, price, available, catName) => {
  const r = await q(
    `INSERT INTO recipe (name,description,unid,caid,price,currency,available)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING rid`,
    [name, desc, u.pcs, rc[catName], price, currency, available]
  )
  return r.rows[0].rid
}

const r1 = await ins('Panna Cotta',  'Classic Italian dessert', 'AMD', 1200, true,  'desserts')
const r2 = await ins('Crème Brûlée', 'French custard classic',  'AMD', 1500, true,  'desserts')
const r3 = await ins('Tiramisu',     'Italian coffee cake',     'AMD', 1800, true,  'desserts')
const r4 = await ins('Espresso',     'Strong black coffee',     'AMD',  600, true,  'hot drinks')
const r5 = await ins('Latte',        'Espresso with steamed milk','AMD', 800, true,  'hot drinks')
      await ins('Bruschetta',  'Toasted bread with toppings','AMD', 900, false, 'starters')

// Menu
const { rows: [{ uid: manufUid }] } = await q(`SELECT uid FROM "user" WHERE is_manufacturer = true LIMIT 1`)
const { rows: [{ mid }] } = await q(
  `INSERT INTO menu (name,available,delivery_fee,owner_uid) VALUES ('Spring 2024',true,500,$1) RETURNING mid`,
  [manufUid]
)
await q(`INSERT INTO menu (name,available,delivery_fee,owner_uid) VALUES ('Summer Specials',false,300,$1)`, [manufUid])

for (const rid of [r1, r2, r4, r5]) {
  await q(`INSERT INTO menu_recipe (mid,rid) VALUES ($1,$2)`, [mid, rid])
}

// Sample orders
const { rows: [{ uid: custUid }] } = await q(`SELECT uid FROM "user" WHERE is_manufacturer = false LIMIT 1`)

const { rows: [{ oid: o1 }] } = await q(
  `INSERT INTO "order" (owner_uid,mid,pickup,status) VALUES ($1,$2,false,'New') RETURNING oid`,
  [custUid, mid]
)
await q(`INSERT INTO order_item (oid,rid,qty,price) VALUES ($1,$2,2,1200)`, [o1, r1])
await q(`INSERT INTO order_item (oid,rid,qty,price) VALUES ($1,$2,1,600)`,  [o1, r4])

const { rows: [{ oid: o2 }] } = await q(
  `INSERT INTO "order" (owner_uid,mid,pickup,status) VALUES ($1,$2,true,'Accepted') RETURNING oid`,
  [custUid, mid]
)
await q(`INSERT INTO order_item (oid,rid,qty,price) VALUES ($1,$2,1,1800)`, [o2, r3])

await client.end()
console.log('✅ Seed complete!')
console.log('   Customer:     sophie@example.com / pass123')
console.log('   Manufacturer: arman@puncotta.com / pass123')
