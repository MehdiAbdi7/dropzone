# DropZone

Full stack e-commerce app for an Algerian reseller of laptops, smartphones and watches imported from Europe, sold **new or refurbished**. Built with Next.js, Express, PostgreSQL (Prisma) and TypeScript.

Unofficial demo built for DropZone. Not affiliated with or endorsed by DropZone. The site shows a demo banner and is not indexed.

## What makes it specific

- **One product per device model**, sold new (classic variants with stock) or refurbished.
- **Every refurbished device is unique** (stock 0 or 1, enforced by a PostgreSQL `CHECK`) and has its own condition report: grade out of 10, battery health, replaced parts, visible defects and functional limitations. Limitations are shown first and must be accepted at checkout.
- **Deals**: a variant can come with free accessories taken from the catalogue. They become 0 DA order lines and their stock goes down in the same transaction.
- **A checkbox-driven back-office form**: category, device model (173 models seeded, more can be added inline), options, condition report and gifts are picked from lists that grow as the shop adds values.
- **The customer always confirms what they saw**: the cart preview returns a hash of its lines; the order is refused (409) if prices, stock or gifts changed in between.

## Stack

| Part | Tools |
|---|---|
| API | Node 22, Express 5, Prisma 7 with PostgreSQL 18, Zod 4, JWT in an httpOnly cookie, bcrypt, express-rate-limit, Cloudinary |
| Front | Next.js 16 (App Router), React 19, Tailwind CSS 4, Redux Toolkit and RTK Query, React Hook Form |
| Tests | Vitest and Supertest against a dedicated PostgreSQL database (57 tests) |
| Ops | Docker Compose (PostgreSQL, migrations, API, front) |

## Run locally

Requirements: Node 22+, PostgreSQL 18.

```bash
# API (server/.env from server/.env.example, server/.env.test with the test database)
cd server
npm ci
npx prisma migrate deploy
npm run seed -- --apply
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=a-long-password npm run create-admin
npm run dev

# Front (client/.env.local: API_URL=http://localhost:5100)
cd client
npm ci
npm run dev
```

Tests: `cd server && npx vitest run` (the test database receives the migrations automatically).

## Run with Docker

```bash
cp .env.example .env   # fill in POSTGRES_PASSWORD and JWT_SECRET
docker compose up --build
docker compose run --rm migrate npm run seed -- --apply
```

The shop is then on http://localhost:3000.

## Project layout

```
client/   Next.js: app/ (shop, account, admin), features/ (cart, products, orders, auth, admin), lib/, config/
server/   Express: modules/ (products, orders, auth, categories, models, choices, users, stats), middlewares/, prisma/
```

Each API module keeps its routes, validation (Zod) and, when there is business logic, a service. The admin router is protected in one line: `app.use("/admin", requireAuth, requireRole("admin"), adminRouter)`.

## Credits

Brand logos in `client/public/brands/` come from [Simple Icons](https://simpleicons.org) 16.36.0 (CC0 1.0). The brands themselves belong to their owners; they are shown only to identify the products sold.
