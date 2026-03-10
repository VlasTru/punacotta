# 🍮 Pun&Cotta

Full-stack pastry delivery app. Node.js + DuckDB backend, React + Vite frontend.

## Stack

- **Frontend**: React 18, Vite, no UI library (custom components)
- **Backend**: Express.js (ESM), DuckDB persistent storage
- **Auth**: JWT (Bearer token), bcrypt password hashing
- **Email**: Nodemailer (logs to console in dev; set SMTP env vars for real sending)

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

### 3. Seed demo data
```bash
npm run seed
```

This creates:
- **Customer**: sophie@example.com / pass123
- **Manufacturer**: arman@puncotta.com / pass123
- Sample products, recipes, menus, and orders

### 4. Run the app
```bash
npm run dev
```

This starts both:
- API server at http://localhost:3001
- Vite dev server at http://localhost:5173

Open http://localhost:5173 in your browser.

## Project Structure

```
puncotta/
├── server/
│   ├── index.js          # Express server entry
│   ├── db.js             # DuckDB connection + schema bootstrap
│   ├── auth.js           # JWT helpers + middleware
│   ├── mail.js           # Nodemailer (console in dev)
│   ├── seed.js           # Demo data seeder
│   └── routes/
│       ├── auth.js       # Register, login, verify, reset
│       ├── products.js   # CRUD products
│       ├── recipes.js    # CRUD recipes
│       ├── menus.js      # CRUD menus + recipe assignment
│       └── orders.js     # Place + process orders
├── src/
│   ├── main.jsx          # React entry
│   ├── App.jsx           # All pages + components
│   └── api.js            # Typed fetch wrapper
├── data/
│   └── puncotta.db       # DuckDB file (auto-created)
├── index.html
├── vite.config.js
└── package.json
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Login, get JWT |
| POST | /api/auth/forgot | — | Request password reset |
| POST | /api/auth/reset/:token | — | Reset password |
| POST | /api/auth/verify/:token | — | Verify email |
| GET | /api/auth/me | ✓ | Get current user |
| GET | /api/products | Manufacturer | List products |
| POST | /api/products | Manufacturer | Create product |
| DELETE | /api/products | Manufacturer | Bulk delete |
| GET | /api/recipes | Manufacturer | List recipes |
| GET | /api/recipes/available | ✓ | Available recipes (for menus/ordering) |
| POST | /api/recipes | Manufacturer | Create recipe |
| PATCH | /api/recipes/:rid | Manufacturer | Update recipe |
| DELETE | /api/recipes | Manufacturer | Bulk delete |
| GET | /api/menus | ✓ | List menus (filtered by role) |
| POST | /api/menus | Manufacturer | Create menu |
| PATCH | /api/menus/:mid | Manufacturer | Update menu |
| POST | /api/menus/:mid/recipes | Manufacturer | Add recipes to menu |
| DELETE | /api/menus/:mid/recipes | Manufacturer | Remove recipes from menu |
| GET | /api/orders | ✓ | List orders (filtered by role) |
| POST | /api/orders | Customer | Place order |
| PATCH | /api/orders/:oid/advance | Manufacturer | Advance order status |
| PATCH | /api/orders/:oid/decline | Manufacturer | Decline order |
| PATCH | /api/orders/:oid/cancel | Customer | Cancel order |
| PATCH | /api/orders/:oid/confirm-delivery | Customer | Confirm delivery |

## Email (Dev)

Emails are logged to the server console. Look for `📧 [DEV EMAIL]` output when registering, resetting passwords, or placing orders.

For production, set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` in `.env`.

## Deploying

1. `npm run build` — builds frontend to `dist/`
2. Serve `dist/` as static files from Express (add `app.use(express.static('dist'))`)
3. Set `NODE_ENV=production` and all SMTP env vars
4. The DuckDB file in `data/` persists all data — back it up regularly
