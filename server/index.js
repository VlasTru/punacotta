// server/index.js
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

import { getDb } from './db.js'
import authRoutes    from './routes/auth.js'
import productRoutes from './routes/products.js'
import recipeRoutes  from './routes/recipes.js'
import menuRoutes    from './routes/menus.js'
import orderRoutes   from './routes/orders.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Ensure data directory exists
mkdirSync(path.join(__dirname, '..', 'data'), { recursive: true })

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use(cookieParser())

// Warm up DB on start
await getDb()
console.log('✅ DuckDB connected')

app.use('/api/auth',     authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/recipes',  recipeRoutes)
app.use('/api/menus',    menuRoutes)
app.use('/api/orders',   orderRoutes)

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`🍮 Pun&Cotta API running at http://localhost:${PORT}`)
})
