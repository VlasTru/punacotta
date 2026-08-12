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

const BASE_URL = process.env.URL || 'https://punacotta.netlify.app'

// ─── MAIL ─────────────────────────────────────────────────────────────────────
async function sendMail(to, subject, text, html) {
  if (process.env.RESEND_API_KEY) {
    const from = process.env.SMTP_FROM || 'Pun&Cotta <onboarding@resend.dev>'
    const res = await fetch('https://api.resend.com/emails', {
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.RESEND_API_KEY}`},
      body: JSON.stringify({ from, to:[to], subject, text, html: html||text.replace(/\n/g,'<br>') }),
    })
    if (!res.ok) console.error('Resend error:', await res.text())
    return
  }
  console.log(`📧 [NO MAIL] To:${to} | ${subject}`)
}

function mailHtml(title, body, cta_url, cta_label) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:500px;margin:40px auto;color:#2c1810">
  <h2 style="font-family:Georgia,serif;color:#c8873a">${title}</h2>
  <p style="line-height:1.6;color:#8b7355">${body}</p>
  ${cta_url?`<a href="${cta_url}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#c8873a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">${cta_label}</a>`:''}
  <p style="font-size:12px;color:#bbb;margin-top:32px">Tanelu · This is an automated notification.</p>
  </body></html>`
}

// ─── ROSTER AUTOMATION ────────────────────────────────────────────────────────
async function runRosterAutomation() {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const utcHour  = now.getUTCHours()

  // Get all restaurants with their schedule
  const restaurants = await dbq(
    `SELECT uid, business_name, first_name, schedule FROM "user" WHERE is_manufacturer=true`)

  for (const r of restaurants) {
    try {
      await processRosterForRestaurant(r, todayStr, utcHour)
    } catch(e) {
      console.error(`Roster automation failed for uid=${r.uid}:`, e.message)
    }
  }
}

function getMondayOf(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()
  const diff = day===0 ? -6 : 1-day
  d.setUTCDate(d.getUTCDate()+diff)
  return d.toISOString().split('T')[0]
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate()+n)
  return d.toISOString().split('T')[0]
}

async function processRosterForRestaurant(restaurant, todayStr, utcHour) {
  const uid = restaurant.uid
  const restaurantName = restaurant.business_name || restaurant.first_name || 'your restaurant'

  // Current week's Monday
  const weekStart = getMondayOf(todayStr)
  const weekEnd   = addDays(weekStart, 6) // Sunday

  // ── 1. Reminder emails: published roster, employees who haven't posted ────────
  // Run every morning (UTC 08:00)
  const publishedRosters = await dbq(
    `SELECT * FROM roster WHERE owner_uid=$1 AND status='published'
     AND week_start >= $2`, [uid, todayStr])

  for (const roster of publishedRosters) {
    const allEmps = await dbq(
      `SELECT uid, email, first_name FROM "user" WHERE employer_uid=$1 AND email IS NOT NULL`, [uid])
    const posted = await dbq(
      `SELECT DISTINCT uid FROM roster_slot WHERE roid=$1`, [roster.roid])
    const postedUids = new Set(posted.map(p=>String(p.uid)))
    const wk = new Date(roster.week_start+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short'})

    for (const emp of allEmps) {
      if (!postedUids.has(String(emp.uid))) {
        await sendMail(
          emp.email,
          `Reminder: post your availability for week of ${wk}`,
          `Hi ${emp.first_name},\n\nThe roster for the week of ${wk} is published and waiting for your availability. Please log in and post your time slots.\n\nTanelu`,
          mailHtml(
            `Reminder: post your availability`,
            `The roster for the week of <strong>${wk}</strong> at ${restaurantName} is published. You haven't posted your time slots yet — please do so before it is approved.`,
            `${BASE_URL}/#roster`, 'Open roster'
          )
        )
        console.log(`📧 Reminder sent to ${emp.email} for roster ${roster.roid}`)
      }
    }
  }

  // ── 2. Auto-approve: at end of last working day ───────────────────────────────
  // Determine last working day and closing hour from restaurant schedule JSON
  // schedule is stored as {mon:{periods:[{from,to}],...}, tue:...} keyed by lowercase day name
  const DAY_NAMES = ['mon','tue','wed','thu','fri','sat','sun']
  const schedule = restaurant.schedule || {}

  // Find which days have any periods defined (i.e. are working days)
  const workingDayIndices = DAY_NAMES.map((d,i)=>({d,i}))
    .filter(({d})=> schedule[d] && schedule[d].periods && schedule[d].periods.length>0)
    .map(({i})=>i)
  const activeDays = workingDayIndices.length ? workingDayIndices : [0,1,2,3,4]

  // Today's day-of-week index (0=Mon..6=Sun)
  const todayDow = (new Date(todayStr+'T00:00:00Z').getUTCDay()+6)%7
  const lastWorkDow = Math.max(...activeDays)
  const isLastWorkingDay = todayDow === lastWorkDow

  // Last period close time on the last working day
  const lastDayName = DAY_NAMES[lastWorkDow]
  const lastDayPeriods = schedule[lastDayName]?.periods || []
  const lastCloseTime = lastDayPeriods.length
    ? lastDayPeriods[lastDayPeriods.length-1].to || '18:00'
    : '18:00'
  const closeHour = parseInt(lastCloseTime.split(':')[0])
  const isLastHour = utcHour === Math.max(0, closeHour - 1)

  const currentRoster = await dbq(
    `SELECT * FROM roster WHERE owner_uid=$1 AND week_start=$2`, [uid, weekStart])
  const roster = currentRoster[0]

  if (roster && isLastWorkingDay && isLastHour) {
    // Auto-approve
    if (roster.auto_approve && roster.status==='published') {
      await dbr(`UPDATE roster SET status='approved',approved_at=NOW() WHERE roid=$1`, [roster.roid])
      console.log(`✅ Auto-approved roster ${roster.roid} for uid=${uid}`)
      const emps = await dbq(
        `SELECT email, first_name FROM "user" WHERE employer_uid=$1 AND email IS NOT NULL`, [uid])
      const wk = new Date(weekStart+'T00:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short'})
      for (const emp of emps) {
        await sendMail(emp.email,
          `Roster approved for week of ${wk}`,
          `Hi ${emp.first_name},\n\nThe roster for week of ${wk} has been auto-approved. Your schedule is now final.\n\nTanelu`,
          mailHtml('Roster auto-approved',
            `The roster for the week of <strong>${wk}</strong> at ${restaurantName} has been automatically approved. Your schedule is now final.`,
            `${BASE_URL}/#roster`, 'View roster'))
      }
    }

    // Auto-clone: copy current week → next week if not already cloned
    if (roster.auto_clone && ['approved','published'].includes(roster.status)) {
      const nextWeek = addDays(weekStart, 7)
      const [existingNext] = await dbq(
        `SELECT roid FROM roster WHERE owner_uid=$1 AND week_start=$2`, [uid, nextWeek])
      if (!existingNext) {
        // Create next week roster
        const res = await dbr(
          `INSERT INTO roster (owner_uid,week_start,cloned_from,auto_clone,auto_approve)
           VALUES ($1,$2,$3,$4,$5) RETURNING roid`,
          [uid, nextWeek, roster.roid, roster.auto_clone, roster.auto_approve])
        const newRoid = res.rows[0].roid
        // Copy slots
        const slots = await dbq('SELECT * FROM roster_slot WHERE roid=$1', [roster.roid])
        for (const s of slots) {
          const newDate = addDays(String(s.slot_date).slice(0,10), 7)
          await dbr(
            'INSERT INTO roster_slot (roid,uid,slot_date,start_time,end_time) VALUES ($1,$2,$3,$4,$5)',
            [newRoid, s.uid, newDate, s.start_time, s.end_time])
        }
        console.log(`✅ Auto-cloned roster for uid=${uid} → week ${nextWeek}`)
      } else {
        console.log(`ℹ️ Auto-clone skipped for uid=${uid}: next week already has a roster`)
      }
    }
  }
}



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
      await syncDraftOrdersScheduled(uid).catch(err=>console.error(`Draft sync failed for uid=${uid}:`,err))
    }
    await runRosterAutomation().catch(err=>console.error('Roster automation failed:',err))
    console.log(`✅ Forecast + draft sync + roster automation complete for ${users.length} restaurants`)
    return { statusCode: 200 }
  } catch(err) {
    console.error('Scheduled error:', err)
    return { statusCode: 500 }
  }
}

async function syncDraftOrdersScheduled(ownerUid) {
  const forecasts = await dbq(`SELECT pid, tg FROM product_forecast WHERE owner_uid=$1 AND tg < 0`, [ownerUid])
  if (!forecasts.length) {
    await dbr(`DELETE FROM supplier_order_item WHERE soid IN (SELECT soid FROM supplier_order WHERE owner_uid=$1 AND status='New')`, [ownerUid])
    await dbr(`DELETE FROM supplier_order WHERE owner_uid=$1 AND status='New'`, [ownerUid])
    return
  }
  const supplierGroups = {}
  for (const { pid, tg } of forecasts) {
    const qtyNeeded = Math.abs(Number(tg))
    const links = await dbq(`SELECT ps.sid, ps.price, ps.currency FROM product_supplier ps JOIN supplier s ON s.sid=ps.sid WHERE ps.pid=$1 AND s.owner_uid=$2 ORDER BY ps.price ASC NULLS LAST LIMIT 1`, [pid, ownerUid])
    if (!links.length) continue
    const { sid, price, currency } = links[0]
    if (!supplierGroups[sid]) supplierGroups[sid] = []
    supplierGroups[sid].push({ pid, qty_needed:qtyNeeded, unit_price:price||0, currency:currency||'AMD' })
  }
  for (const [sid, items] of Object.entries(supplierGroups)) {
    const [existing] = await dbq(`SELECT soid FROM supplier_order WHERE owner_uid=$1 AND sid=$2 AND status='New'`, [ownerUid, sid])
    if (existing) {
      await dbr('DELETE FROM supplier_order_item WHERE soid=$1', [existing.soid])
      for (const it of items) await dbr(`INSERT INTO supplier_order_item (soid,pid,qty_ordered,unit_price,currency) VALUES ($1,$2,$3,$4,$5)`, [existing.soid,it.pid,it.qty_needed,it.unit_price,it.currency])
    } else {
      const sup = (await dbq('SELECT * FROM supplier WHERE sid=$1', [sid]))[0]
      const terms = sup?.schedule?.delivery||[]
      const term = terms.sort((a,b)=>(a.days_before??99)-(b.days_before??99))[0]
      const now = new Date()
      const mm = String(now.getMinutes()).padStart(2,'0')
      const [{ count }] = await dbq('SELECT COUNT(*) AS count FROM supplier_order WHERE owner_uid=$1', [ownerUid])
      const seq = parseInt(count)+1
      const words = sup.name.trim().split(/\s+/)
      const initials = words.length===1 ? sup.name.slice(0,2).toUpperCase() : (words[0][0]+words[1][0]).toUpperCase()
      const res = await dbr(`INSERT INTO supplier_order (owner_uid,sid,order_id,status,delivery_term,delivery_fee,currency) VALUES ($1,$2,$3,'New',$4,0,$5) RETURNING soid`, [ownerUid,sid,`${seq}-${initials}-${mm}`,term?.name||null,'AMD'])
      const soid = res.rows[0].soid
      for (const it of items) await dbr(`INSERT INTO supplier_order_item (soid,pid,qty_ordered,unit_price,currency) VALUES ($1,$2,$3,$4,$5)`, [soid,it.pid,it.qty_needed,it.unit_price,it.currency])
    }
  }
  const activeSids = Object.keys(supplierGroups).map(Number)
  const allDrafts = await dbq(`SELECT soid, sid FROM supplier_order WHERE owner_uid=$1 AND status='New'`, [ownerUid])
  for (const draft of allDrafts) {
    if (!activeSids.includes(Number(draft.sid))) {
      await dbr('DELETE FROM supplier_order_item WHERE soid=$1', [draft.soid])
      await dbr('DELETE FROM supplier_order WHERE soid=$1', [draft.soid])
    }
  }
}
