// netlify/functions/stock-scheduled.js
// Runs hourly. Asks the API to run the daily stock job (automatic wastage of expired products +
// notification refresh) for every restaurant whose work day has started and which has not run today.
import { createHash } from 'crypto'

export const handler = async () => {
  const base = process.env.APP_URL || process.env.URL || 'https://tanelu.com'
  const token = createHash('sha256')
    .update(String(process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL || '')).digest('hex')
  try {
    const res = await fetch(`${base}/api/cron/stock-daily`, { method: 'POST', headers: { 'x-cron-token': token } })
    console.log('stock-daily', res.status)
  } catch (e) {
    console.error('stock-daily failed', e.message)
  }
  return { statusCode: 200 }
}
