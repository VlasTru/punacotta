# 🍮 Pun&Cotta — Vercel + Neon Edition

Full-stack pastry delivery app rebuilt for Vercel (serverless functions) + Neon Postgres.

## Stack

- **Frontend**: React 18, Vite
- **API**: Vercel Functions (Node 20, one file per endpoint)
- **Database**: PostgreSQL via [Neon](https://neon.tech) (free tier works)
- **Auth**: JWT + bcrypt
- **Email**: Nodemailer (console in dev; set SMTP vars for production)

---

## Local development

### 1. Install dependencies
```bash
npm install
```

### 2. Set up a local Postgres DB (or use Neon free tier)
If using Neon: create a project at https://neon.tech, copy the connection string.

### 3. Configure environment
```bash
cp .env.example .env.local
# Fill in DATABASE_URL and JWT_SECRET
```

### 4. Run the migration
```bash
DATABASE_URL=your_connection_string node scripts/migrate.js
```

### 5. Seed demo data
```bash
DATABASE_URL=your_connection_string node scripts/seed.js
```

### 6. Install Vercel CLI and run locally
```bash
npm install -g vercel
vercel dev
```
Open http://localhost:3000

---

## Deploy to Vercel

### 1. Push to GitHub
```bash
git init && git add . && git commit -m "init"
gh repo create puncotta --public --push
```

### 2. Import into Vercel
- Go to https://vercel.com/new
- Import your GitHub repo
- **Framework Preset**: select **Vite**
- Vercel auto-detects `api/` folder for serverless functions

### 3. Add environment variables in Vercel dashboard
Under **Settings → Environment Variables**, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Neon connection string (use the **pooled** URL) |
| `JWT_SECRET` | A long random string |
| `SMTP_HOST` | (optional) Your SMTP host |
| `SMTP_PORT` | (optional) 587 |
| `SMTP_USER` | (optional) |
| `SMTP_PASS` | (optional) |

### 4. Run migration against production DB
```bash
DATABASE_URL=your_neon_pooled_url node scripts/migrate.js
DATABASE_URL=your_neon_pooled_url node scripts/seed.js
```

### 5. Deploy
Vercel deploys automatically on every push to `main`.

---

## Project Structure

```
puncotta-vercel/
├── api/                        # Vercel Functions (each file = one endpoint)
│   ├── auth/
│   │   ├── login.js            POST /api/auth/login
│   │   ├── register.js         POST /api/auth/register
│   │   ├── forgot.js           POST /api/auth/forgot
│   │   ├── reset.js            POST /api/auth/reset
│   │   ├── verify.js           POST /api/auth/verify
│   │   └── me.js               GET  /api/auth/me
│   ├── products/
│   │   ├── index.js            GET / POST / DELETE /api/products
│   │   └── lookups.js          GET /api/products/lookups
│   ├── recipes/
│   │   ├── index.js            GET / POST / DELETE /api/recipes
│   │   ├── available.js        GET /api/recipes/available
│   │   ├── lookups.js          GET /api/recipes/lookups
│   │   └── [rid].js            PATCH /api/recipes/:rid
│   ├── menus/
│   │   ├── index.js            GET / POST /api/menus
│   │   ├── [mid].js            GET / PATCH /api/menus/:mid
│   │   └── [mid]/
│   │       └── recipes.js      POST / DELETE /api/menus/:mid/recipes
│   └── orders/
│       ├── index.js            GET / POST /api/orders
│       └── [oid]/
│           └── [action].js     PATCH /api/orders/:oid/:action
├── lib/                        # Shared utilities
│   ├── db.js                   Postgres pool (pg)
│   ├── auth.js                 JWT helpers
│   └── mail.js                 Nodemailer
├── scripts/
│   ├── migrate.js              Create schema + seed lookups
│   └── seed.js                 Insert demo data
├── src/                        # React frontend (unchanged)
│   ├── App.jsx
│   ├── api.js
│   └── main.jsx
├── vercel.json
├── vite.config.js
└── package.json
```

## Demo accounts (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Customer | sophie@example.com | pass123 |
| Manufacturer | arman@puncotta.com | pass123 |
