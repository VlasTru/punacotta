// server/auth.js
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'puncotta-dev-secret-change-in-prod'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET)
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' })
  try {
    req.user = verifyToken(header.slice(7))
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

export function requireManufacturer(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user.is_manufacturer) return res.status(403).json({ error: 'Manufacturers only' })
    next()
  })
}
