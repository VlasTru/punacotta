// netlify/functions/market-scheduled.js
// Runs every 5 minutes. Asks the API to post the daily "items without a marketplace category" reminder
// for every restaurant that opened at least 5 minutes ago today and has not had it yet.
import { createHash } from 'crypto'

export const handler = async () => {
  const base = process.env.APP_URL || process.env.URL || 'https://tanelu.com'
  const token = createHash('sha256')
    .update(String(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || '')).digest('hex')
  try {
    const res = await fetch(`${base}/api/cron/market-daily`, { method: 'POST', headers: { 'x-cron-token': token } })
    console.log('market-daily', res.status)
  } catch (e) {
    console.error('market-daily failed', e.message)
  }
  return { statusCode: 200 }
}
