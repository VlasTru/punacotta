// netlify/functions/roster-scheduled.js
// Runs hourly. Roster automation in each restaurant's OWN time zone (schedule.timezone):
//   - reminder emails to staff who have not posted slots: once a day, at 09:00 local time
//   - auto-approve + auto-clone: in the last hour before closing on the restaurant's last working day
// Both steps are safe to repeat: approval only touches a roster that is still 'published', and a clone
// only happens when next week has no roster yet.
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
async function dbq(sql, params = []) { return (await getPool().query(sql, params)).rows }
async function dbr(sql, params = []) { return getPool().query(sql, params) }

const BASE_URL = process.env.URL || 'https://punacotta.netlify.app'
const REMINDER_HOUR = 9
const DAY_NAMES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

// ─── MAIL ─────────────────────────────────────────────────────────────────────
async function sendMail(to, subject, text, html) {
  if (process.env.RESEND_API_KEY) {
    const from = process.env.SMTP_FROM || 'Pun&Cotta <onboarding@resend.dev>'
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.RESEND_API_KEY}` },
      body: JSON.stringify({ from, to: [to], subject, text, html: html || text.replace(/\n/g, '<br>') }),
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
  ${cta_url ? `<a href="${cta_url}" style="display:inline-block;margin:20px 0;padding:12px 28px;background:#c8873a;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">${cta_label}</a>` : ''}
  <p style="font-size:12px;color:#bbb;margin-top:32px">Tanelu · This is an automated notification.</p>
  </body></html>`
}

// ─── TIME ─────────────────────────────────────────────────────────────────────
function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().split('T')[0]
}

// Local date, hour and weekday (0 = Mon … 6 = Sun) in a time zone
export function localNow(tz, ms = Date.now()) {
  let p
  try {
    p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', weekday: 'short',
    }).formatToParts(new Date(ms)).map(x => [x.type, x.value]))
  } catch {
    return localNow('UTC', ms)
  }
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(p.weekday)
  return { dateStr: `${p.year}-${p.month}-${p.day}`, hour: +p.hour % 24, dow }
}

function parseSchedule(raw) {
  try { return typeof raw === 'string' ? JSON.parse(raw) : (raw || {}) } catch { return {} }
}

// ─── ROSTER AUTOMATION ────────────────────────────────────────────────────────
export async function processRosterForRestaurant(restaurant, nowMs = Date.now()) {
  const uid = restaurant.uid
  const restaurantName = restaurant.business_name || restaurant.first_name || 'your restaurant'
  const schedule = parseSchedule(restaurant.schedule)
  const tz = schedule.timezone || 'UTC'
  const { dateStr: today, hour, dow } = localNow(tz, nowMs)
  const weekStart = addDays(today, -dow)            // Monday of the local week

  // 1. Reminders: published rosters, employees who have not posted yet — once a day
  if (hour === REMINDER_HOUR) {
    const published = await dbq(
      `SELECT roid, TO_CHAR(week_start,'YYYY-MM-DD') AS week_start FROM roster WHERE owner_uid=$1 AND status='published' AND week_start >= $2`, [uid, weekStart])
    for (const roster of published) {
      const emps = await dbq(`SELECT uid, email, first_name FROM "user" WHERE employer_uid=$1 AND email IS NOT NULL`, [uid])
      const posted = new Set((await dbq('SELECT DISTINCT uid FROM roster_slot WHERE roid=$1', [roster.roid])).map(p => String(p.uid)))
      const wk = new Date(roster.week_start + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      for (const emp of emps) {
        if (posted.has(String(emp.uid))) continue
        await sendMail(emp.email,
          `Reminder: post your availability for week of ${wk}`,
          `Hi ${emp.first_name},\n\nThe roster for the week of ${wk} is published and waiting for your availability. Please log in and post your time slots.\n\nTanelu`,
          mailHtml('Reminder: post your availability',
            `The roster for the week of <strong>${wk}</strong> at ${restaurantName} is published. You haven't posted your time slots yet — please do so before it is approved.`,
            `${BASE_URL}/#roster`, 'Open roster'))
      }
    }
  }

  // 2. Auto-approve / auto-clone in the last hour before closing on the last working day
  const workingDays = DAY_NAMES.map((d, i) => ({ d, i }))
    .filter(({ d }) => schedule[d]?.periods?.length > 0).map(({ i }) => i)
  const activeDays = workingDays.length ? workingDays : [0, 1, 2, 3, 4]
  const lastWorkDow = Math.max(...activeDays)
  if (dow !== lastWorkDow) return
  const periods = schedule[DAY_NAMES[lastWorkDow]]?.periods || []
  const lastClose = periods.length ? (periods[periods.length - 1].to || '18:00') : '18:00'
  const closeHour = parseInt(lastClose.split(':')[0], 10)
  if (hour !== Math.max(0, closeHour - 1)) return

  const [roster] = await dbq('SELECT * FROM roster WHERE owner_uid=$1 AND week_start=$2', [uid, weekStart])
  if (!roster) return

  if (roster.auto_approve && roster.status === 'published') {
    await dbr(`UPDATE roster SET status='approved',approved_at=NOW() WHERE roid=$1 AND status='published'`, [roster.roid])
    roster.status = 'approved'
    console.log(`✅ Auto-approved roster ${roster.roid} for uid=${uid}`)
    const emps = await dbq(`SELECT email, first_name FROM "user" WHERE employer_uid=$1 AND email IS NOT NULL`, [uid])
    const wk = new Date(weekStart + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    for (const emp of emps) {
      await sendMail(emp.email,
        `Roster approved for week of ${wk}`,
        `Hi ${emp.first_name},\n\nThe roster for week of ${wk} has been auto-approved. Your schedule is now final.\n\nTanelu`,
        mailHtml('Roster auto-approved',
          `The roster for the week of <strong>${wk}</strong> at ${restaurantName} has been automatically approved. Your schedule is now final.`,
          `${BASE_URL}/#roster`, 'View roster'))
    }
  }

  if (roster.auto_clone && ['approved', 'published'].includes(roster.status)) {
    const nextWeek = addDays(weekStart, 7)
    const [existingNext] = await dbq('SELECT roid FROM roster WHERE owner_uid=$1 AND week_start=$2', [uid, nextWeek])
    if (existingNext) { console.log(`ℹ️ Auto-clone skipped for uid=${uid}: next week already has a roster`); return }
    const res = await dbr(
      `INSERT INTO roster (owner_uid,week_start,cloned_from,auto_clone,auto_approve)
       VALUES ($1,$2,$3,$4,$5) RETURNING roid`,
      [uid, nextWeek, roster.roid, roster.auto_clone, roster.auto_approve])
    const newRoid = res.rows[0].roid
    const slots = await dbq("SELECT uid, TO_CHAR(slot_date,'YYYY-MM-DD') AS slot_date, start_time, end_time FROM roster_slot WHERE roid=$1", [roster.roid])
    for (const s of slots) {
      await dbr('INSERT INTO roster_slot (roid,uid,slot_date,start_time,end_time) VALUES ($1,$2,$3,$4,$5)',
        [newRoid, s.uid, addDays(s.slot_date, 7), s.start_time, s.end_time])
    }
    console.log(`✅ Auto-cloned roster for uid=${uid} → week ${nextWeek}`)
  }
}

export const handler = async () => {
  try {
    const restaurants = await dbq(`SELECT uid, business_name, first_name, schedule FROM "user" WHERE is_manufacturer=true`)
    for (const r of restaurants) {
      await processRosterForRestaurant(r).catch(e => console.error(`Roster automation failed for uid=${r.uid}:`, e.message))
    }
    return { statusCode: 200 }
  } catch (err) {
    console.error('Roster scheduled error:', err)
    return { statusCode: 500 }
  }
}
