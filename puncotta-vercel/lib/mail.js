// lib/mail.js
import nodemailer from 'nodemailer'

function makeTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  }
  return nodemailer.createTransport({ jsonTransport: true })
}

const FROM = process.env.SMTP_FROM || '"Pun&Cotta" <hello@puncotta.com>'
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : (process.env.BASE_URL || 'http://localhost:5173')

function devLog(info) {
  if (process.env.SMTP_HOST) return
  try {
    const msg = JSON.parse(info.message)
    console.log('\n📧 [DEV EMAIL]', msg.to, '|', msg.subject, '\n', msg.text, '\n---')
  } catch {}
}

export async function sendVerification(user, token) {
  const t = makeTransport()
  const link = `${BASE_URL}/verify/${token}`
  const info = await t.sendMail({
    from: FROM, to: user.email,
    subject: 'Welcome to Pun&Cotta – confirm your email',
    text: `Hi, ${user.first_name}\n\nYou must be new to Punacotta. Please click the following link to confirm:\n\n${link}\n\nThe link will be valid for 1 hour.\n\nBest,\nPunacotta.`,
    html: `<p>Hi, <b>${user.first_name}</b></p><p>Please <a href="${link}">click here</a> to confirm your email. Valid for 1 hour.</p><p>Best,<br>Punacotta.</p>`,
  })
  devLog(info)
}

export async function sendPasswordReset(user, token) {
  const t = makeTransport()
  const link = `${BASE_URL}/reset/${token}`
  const info = await t.sendMail({
    from: FROM, to: user.email,
    subject: 'Pun&Cotta – reset your password',
    text: `Hi, ${user.first_name}\n\nIt happens to anyone. Click to reset:\n\n${link}\n\nValid for 1 hour.\n\nBest,\nPunacotta.`,
    html: `<p>Hi, <b>${user.first_name}</b></p><p><a href="${link}">Reset your password</a> — valid for 1 hour.</p><p>Best,<br>Punacotta.</p>`,
  })
  devLog(info)
}

export async function sendOrderPlaced(user, order, businessName) {
  const t = makeTransport()
  const info = await t.sendMail({
    from: FROM, to: user.email,
    subject: `Your order #${order.oid} is heading to the kitchen`,
    text: `Hi, ${user.first_name} ${user.last_name},\n\nYour order #${order.oid} is on the way to the kitchen.\n\nKind regards,\n${businessName}`,
  })
  devLog(info)
}
