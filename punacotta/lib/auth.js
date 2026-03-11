// lib/auth.js
import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET || 'puncotta-dev-secret-change-in-prod'

export function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET)
}

// Returns decoded user or null — callers check and respond themselves
export function getUser(req) {
  try {
    const header = req.headers['authorization'] || ''
    if (!header.startsWith('Bearer ')) return null
    return verifyToken(header.slice(7))
  } catch {
    return null
  }
}

// Helper: send 401 and return false if not authed
export function requireAuth(req, res) {
  const user = getUser(req)
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' })
    return null
  }
  return user
}

// Helper: send 403 and return false if not a manufacturer
export function requireManufacturer(req, res) {
  const user = requireAuth(req, res)
  if (!user) return null
  if (!user.is_manufacturer) {
    res.status(403).json({ error: 'Manufacturers only' })
    return null
  }
  return user
}
