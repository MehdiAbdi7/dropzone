# DropZone

Full stack e-commerce app for an Algerian reseller of laptops, smartphones and tablets imported from Europe, sold **new or refurbished**. Built with Next.js, Express, PostgreSQL (Prisma) and TypeScript.

Unofficial demo built for DropZone. Not affiliated with or endorsed by DropZone. The site shows a demo banner and is not indexed.

## What makes it specific

- **One product per device model**, sold new (classic variants with stock) or refurbished.
- **Every refurbished listing has its own condition report**: grade out of 10, battery health, replaced parts, visible defects and functional limitations. Limitations are shown first and must be accepted at checkout. One listing can cover several identical units from the same shipment (same condition, same colour): its stock is the number of units, up to 10 per cart line.
- **Deals**: a variant can come with free accessories taken from the catalogue. They become 0 DA order lines and their stock goes down in the same transaction.
- **A checkbox-driven back-office form**: category, device model (194 models seeded, more can be added inline), options, condition report and gifts are picked from lists that grow as the shop adds values.
- **The customer always confirms what they saw**: the cart preview returns a hash of its lines; the order is refused (409) if prices, stock or gifts changed in between.

## Stack

| Part | Tools |
|---|---|
| API | Node 22, Express 5, Prisma 7 with PostgreSQL 18, Zod 4, JWT in an httpOnly cookie, bcrypt, express-rate-limit, Cloudinary |
| Front | Next.js 16 (App Router), React 19, Tailwind CSS 4, Redux Toolkit and RTK Query, React Hook Form |
| Tests | API: Vitest and Supertest against a dedicated PostgreSQL database. Front: Vitest on the pure logic |
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

Tests: `cd server && npx vitest run` (the test database receives the migrations automatically) and `cd client && npx vitest run`. Before opening a pull request: `npx tsc --noEmit` in both folders, `npx eslint .` in `client/`.

### The real catalog

`npm run import:dropzone` reads `server/data/dropzone-annonces.tsv`, the 212 Instagram listings of the shop (May to November 2026), and shows what it would do without writing anything. With `-- --apply` it writes, in one transaction: one product per device model, one unit per listing at its listed price, the official specs of each phone and tablet (`src/scripts/import/official-specs.ts`, with the manufacturer page read for each), and the shop's warranty. The mapping from listing names to device models is `src/scripts/import/models-map.ts`.

It can be run again, and the back-office keeps the last word. The importer remembers what each listing said (`import_records` table): on a replay it only rewrites the fields a listing changed since the previous import, so a grade, battery, price, options or reference corrected in the back-office stay, and stock and box are never taken from the listings. A unit or product deleted in the back-office is not recreated, a model left out of a series is not filed again, and the sample products and categories the shop doesn't sell (watches, audiovisual) are removed on the first import only. Likewise, the starting values of the SIM, origin and connectivity lists are created on the first import only: a value the manager deletes doesn't come back.

The dry run does the whole import inside a transaction, then rolls it back. While it runs (a few seconds), the rows it touches are locked, and an order on those products waits for it. Harmless on a local copy; in production, run the import and its dry run outside ordering hours.

## Run with Docker

```bash
cp .env.example .env   # fill in POSTGRES_PASSWORD and JWT_SECRET
docker compose up --build
docker compose run --rm migrate npm run seed -- --apply
```

The shop is then on http://localhost:3000.

## Where to find things

```
client/   Next.js front (the shop and the back-office)
server/   Express API, Prisma schema and migrations, import scripts
```

### API (`server/src`)

Every module in `modules/` follows the same chain, one file per role:

```
<module>.routes.ts      the URL, the validation, and which controller answers. No logic.
<module>.controller.ts  HTTP in, HTTP out: reads the request, calls the service, sends the response.
<module>.service.ts     the business rules and every Prisma query.
<module>.schema.ts      the Zod schemas of what the module accepts, and their TypeScript types.
```

A file exists only when the module needs it (`stats` has no schema, `choices` has an extra `choiceRename.ts` for one rule). To find a feature, start from its `*.routes.ts` and follow the imports. To add an endpoint: schema, then service, then controller, then route, with its test in `server/tests/`.

| Folder | What it holds |
|---|---|
| `modules/` | `auth`, `brands`, `categories`, `choices` (the lists of the product form), `models` (device models and their colours), `orders`, `products`, `series`, `stage` (the home page photos), `stats`, `users` |
| `middlewares/` | `requireAuth`, `requireRole`, `validate` (Zod), rate limiters, image upload, error handler |
| `utils/` | Small shared helpers (`idParams`, `pagination`, `slugify`, `escapeLike`, `AppError`) |
| `config/` | Environment, database client, shipping fees, wilayas |
| `scripts/` | Command-line tools (`npm run seed`, `import:dropzone`, and so on). The file named after the command is a thin wrapper, its logic is in `scripts/lib/` and its data in `scripts/import/` or the `*-data.ts` files |
| `prisma/` | `schema.prisma` and the migrations |

The admin router is protected in one line: `app.use("/admin", requireAuth, requireRole("admin"), adminRouter)`.

### Front (`client/src`)

| Folder | What it holds |
|---|---|
| `app/` | The routes only: `(shop)` the public shop, `(account)` the customer area, `admin` the back-office. A page fetches data and composes components |
| `features/` | One folder per business area (`shop`, `cart`, `orders`, `auth`, `home`, `products`, `admin`), with its components, its RTK Query endpoints (`*Api.ts`) and its pure logic. Logic without React sits next to its test (`stock.ts`, `stock.test.ts`). The back-office endpoints are one file per domain in `features/admin/api/` (`productsApi`, `catalogApi`, `colorsApi`, `stageApi`, `choicesApi`, `ordersApi`). A component stays under about 300 lines: when it grows, its parts go in their own files (`ProductForm` and its `VariantList`, `SaveBar`, `ConditionSheet`…) |
| `styles/` | The CSS, one file per role (colours, Tailwind theme, base, components, series posters, spinner, utilities). `app/globals.css` only imports them, in an order that matters |
| `components/` | What belongs to no business area: `layout` (header, footer, menu) and `ui` (icons, logo, spinner, confirm dialog, form field, theme toggle) |
| `config/` | Fixed data and rules: catalogue options, colours, warranty, wilayas, shipping |
| `lib/` | Technical helpers: API client, store, formatting, hooks |
| `types/` | The shapes of the API responses |

### Conventions

- **KISS**: the simplest thing that works. No abstraction before the third use; a plain function before a class; the database does what it can do (constraints, `UNIQUE`, `CHECK`).
- **DRY**: one rule, one place. A rule needed by several modules lives in `utils/` or `config/`. Three rules exist in both `client/` and `server/` because the two folders are deployed separately (wilayas, default warranty, brand logos): `server/tests/copiesDuFront.test.ts` fails if the copies drift apart.
- **YAGNI**: no code for a need that does not exist yet. An unused export, file or table is deleted, not kept "just in case": Git remembers it.
- A migration that has been applied is never edited: write a new one. Run `prisma migrate dev` on a local database only (a guard in `server/prisma.config.ts` refuses it on a remote one).
- Commits follow `type(scope): message` (`feat`, `fix`, `refactor`, `test`, `chore`). One branch per task, merged by pull request.

## Credits

Brand logos in `client/public/brands/` come from [Simple Icons](https://simpleicons.org) 16.36.0 (CC0 1.0). The brands themselves belong to their owners; they are shown only to identify the products sold.
