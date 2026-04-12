// netlify/functions/forecast-scheduled.js
// Runs daily at 08:00 UTC via Netlify scheduled functions
import pg from 'pg'

const { Pool } = pg
let _pool = null
function getPool() {
  if (_pool) return _pool
  _pool = new Pool({
    connectionString: process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }, max: 3,
  })
  return _pool
}
async function dbq(sql, params=[]) { return (await getPool().query(sql, params)).rows }
async function dbr(sql, params=[]) { return getPool().query(sql, params) }

// ─── ARIMA(1,1,1) forecast ────────────────────────────────────────────────────
function arimaForecast(series, h) {
  if (series.length < 3) return Array(h).fill(series[0]||0)
  const diff = series.slice(1).map((v,i)=>v-series[i])
  const n = diff.length
  const mean = diff.reduce((a,b)=>a+b,0)/n
  const c = diff.map(v=>v-mean)
  const r0 = c.reduce((a,v)=>a+v*v,0)/n
  const r1 = c.slice(1).reduce((a,v,i)=>a+v*c[i],0)/(n-1)
  const phi = r0>0 ? Math.max(-0.99,Math.min(0.99, r1/r0)) : 0
  const resid = c.map((v,i)=>i===0?0:v-phi*c[i-1])
  const theta = -0.3
  let last = diff[diff.length-1]-mean
  let lastRes = resid[resid.length-1]
  const forecast = []
  for (let i=0;i<h;i++) {
    const next = mean+phi*last+theta*lastRes
    forecast.push(next); lastRes=0; last=next
  }
  const result = []
  let prev = series[series.length-1]
  for (const f of forecast) { prev=prev+f; result.push(Math.max(0,prev)) }
  return result
}

async function runForecastForUser(ownerUid) {
  const now = new Date()
  const periodStart = new Date(now); periodStart.setHours(8,0,0,0)
  const periodEnd   = new Date(periodStart); periodEnd.setDate(periodEnd.getDate()+7)

  const products = await dbq(`
    SELECT DISTINCT rp.pid FROM recipe_product rp
    JOIN recipe r ON r.rid=rp.rid
    JOIN menu_recipe mr ON mr.rid=r.rid
    JOIN menu m ON m.mid=mr.mid
    WHERE m.owner_uid=$1 AND r.deleted=false`, [ownerUid])

  for (const { pid } of products) {
    const [stockRow] = await dbq(
      `SELECT COALESCE(SUM(qty),0) AS ts FROM product_stock WHERE pid=$1 AND owner_uid=$2`,
      [pid, ownerUid])
    const ts = Number(stockRow?.ts||0)

    const [tdRow] = await dbq(`
      SELECT COALESCE(SUM(soi.qty_ordered),0) AS td
      FROM supplier_order_item soi
      JOIN supplier_order so ON so.soid=soi.soid
      WHERE soi.pid=$1 AND so.owner_uid=$2 AND so.status='Submitted'
        AND so.etd>=$3 AND so.etd<=$4`,
      [pid, ownerUid, periodStart.toISOString().split('T')[0], periodEnd.toISOString().split('T')[0]])
    const td = Number(tdRow?.td||0)

    const salesRows = await dbq(`
      SELECT DATE(o.created_at) AS day, SUM(oi.qty*rp.qty) AS consumed
      FROM order_item oi
      JOIN recipe_product rp ON rp.rid=oi.rid AND rp.pid=$1
      JOIN "order" o ON o.oid=oi.oid
      JOIN menu m ON m.mid=o.mid
      WHERE m.owner_uid=$2 AND o.created_at>=NOW()-INTERVAL '90 days'
        AND o.status NOT IN ('Declined','Cancelled')
      GROUP BY DATE(o.created_at) ORDER BY day`, [pid, ownerUid])

    let tfSeries = []
    if (salesRows.length>=30) tfSeries = arimaForecast(salesRows.map(r=>Number(r.consumed)),7)
    else if (salesRows.length>0) { const m=salesRows.reduce((s,r)=>s+Number(r.consumed),0)/salesRows.length; tfSeries=Array(7).fill(m); }
    else tfSeries = Array(7).fill(0)

    const tf = tfSeries.reduce((a,b)=>a+b,0)
    const tg = td+ts-tf
    const series = tfSeries.map((f,i)=>(i===0?td:0)+ts-f)

    await dbr(`
      INSERT INTO product_forecast (pid,owner_uid,tg,ts,td,tf,series,period_start,period_end)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (pid,owner_uid) DO UPDATE
        SET tg=$3,ts=$4,td=$5,tf=$6,series=$7,period_start=$8,period_end=$9,computed_at=NOW()`,
      [pid,ownerUid,tg,ts,td,tf,JSON.stringify(series),periodStart.toISOString(),periodEnd.toISOString()])
  }
}

export const handler = async () => {
  try {
    const users = await dbq(`SELECT uid FROM "user" WHERE is_manufacturer=true`)
    for (const { uid } of users) {
      await runForecastForUser(uid).catch(err=>console.error(`Forecast failed for uid=${uid}:`,err))
    }
    console.log(`✅ Forecast run complete for ${users.length} restaurants`)
    return { statusCode: 200 }
  } catch(err) {
    console.error('Scheduled forecast error:', err)
    return { statusCode: 500 }
  }
}
