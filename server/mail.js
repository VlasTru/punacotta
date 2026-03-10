// server/mail.js
import nodemailer from 'nodemailer'

// In dev: log emails to console. In prod: set SMTP_* env vars.
const transporter = nodemailer.createTransport(
  process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      }
    : { jsonTransport: true }  // dev: no actual sending
)

const FROM = process.env.SMTP_FROM || '"Pun&Cotta" <hello@puncotta.com>'
const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'

function devLog(info) {
  if (process.env.SMTP_HOST) return
  try {
    const msg = JSON.parse(info.message)
    console.log('\n📧 [DEV EMAIL]')
    console.log('  To:', msg.to)
    console.log('  Subject:', msg.subject)
    console.log('  ---')
    console.log(msg.text)
    console.log('---\n')
  } catch {}
}

export async function sendVerification(user, token) {
  const link = `${BASE_URL}/verify/${token}`
  const info = await transporter.sendMail({
    from: FROM,
    to: user.email,
    subject: 'Welcome to Pun&Cotta – confirm your email',
    text: `Hi, ${user.first_name}\n\nYou must be new to Punacotta. Please click the following link to confirm that you are the one we're waiting for:\n\n${link}\n\nThe link will be valid for 1 hour.\n\nBest,\nPunacotta.`,
    html: `<p>Hi, <b>${user.first_name}</b></p><p>You must be new to Punacotta. Please <a href="${link}">click here</a> to confirm your email.</p><p>The link will be valid for 1 hour.</p><p>Best,<br>Punacotta.</p>`,
  })
  devLog(info)
}

export async function sendPasswordReset(user, token) {
  const link = `${BASE_URL}/reset/${token}`
  const info = await transporter.sendMail({
    from: FROM,
    to: user.email,
    subject: 'Pun&Cotta – reset your password',
    text: `Hi, ${user.first_name}\n\nIt happens to anyone. Please click the following link to reset your password:\n\n${link}\n\nThe link will be valid for 1 hour.\n\nBest,\nPunacotta.`,
    html: `<p>Hi, <b>${user.first_name}</b></p><p>It happens to anyone. Please <a href="${link}">click here to reset your password</a>.</p><p>The link will be valid for 1 hour.</p><p>Best,<br>Punacotta.</p>`,
  })
  devLog(info)
}

export async function sendOrderPlaced(user, order, businessName) {
  const info = await transporter.sendMail({
    from: FROM,
    to: user.email,
    subject: `Your order #${order.oid} is heading to the kitchen`,
    text: `Hi, ${user.first_name} ${user.last_name},\n\nWe're just letting you know that your order ${order.oid} is on the way to the kitchen. We'll notify you again when it's done, or you may check the status on your Orders page.\n\nThank you.\n\nKind regards,\n${businessName}`,
  })
  devLog(info)
}
