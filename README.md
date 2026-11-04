# DropZone

Full stack e-commerce app for an Algerian reseller of laptops, smartphones and watches imported from Europe, sold **new or refurbished**. Built with Next.js, Express, PostgreSQL (Prisma) and TypeScript.

Unofficial demo built for DropZone. Not affiliated with or endorsed by DropZone. The site shows a demo banner and is not indexed.

## What makes it specific

- **One product per device model**, sold new (classic variants with stock) or refurbished.
- **Every refurbished device is unique** (stock 0 or 1, enforced by a PostgreSQL `CHECK`) and has its own condition report: grade out of 10, battery health, replaced parts, visible defects and functional limitations. Limitations are shown first and must be accepted at checkout.
- **Deals**: a variant can come with free accessories taken from the catalogue. They become 0 DA order lines and their stock goes down in the same transaction.
- **A checkbox-driven back-office form**: category, device model (194 models seeded, more can be added inline), options, condition report and gifts are picked from lists that grow as the shop adds values.
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
npm run import:dropzone -- --apply   # the real catalog, see below
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=a-long-password npm run create-admin
npm run dev

# Front (client/.env.local: API_URL=http://localhost:5100)
cd client
npm ci
npm run dev
```

Tests: `cd server && npx vitest run` (the test database receives the migrations automatically).

### The real catalog

`npm run import:dropzone` reads `server/data/dropzone-annonces.tsv`, the 212 Instagram listings of the shop (May to November 2026), and shows what it would do without writing anything. With `-- --apply` it writes, in one transaction: one product per device model, one unit per listing at its listed price, the official specs of each phone and tablet (`src/scripts/import/official-specs.ts`, with the manufacturer page read for each), and the shop's warranty. The mapping from listing names to device models is `src/scripts/import/models-map.ts`.

It can be run again, and the back-office keeps the last word. The importer remembers what each listing said (`import_records` table): on a replay it only rewrites the fields a listing changed since the previous import, so a grade, battery, price, options or reference corrected in the back-office stay, and stock and box are never taken from the listings. A unit or product deleted in the back-office is not recreated, a model left out of a series is not filed again, and the sample products and categories the shop doesn't sell (watches, audiovisual) are removed on the first import only.

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
