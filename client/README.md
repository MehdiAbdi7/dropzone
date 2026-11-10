# DropZone, front

The Next.js 16 front of DropZone: the public shop and the back-office (`/admin`). The project overview, how to run everything and the folder guide are in the [root README](../README.md#where-to-find-things).

```bash
cp .env.example .env.local   # API_URL=http://localhost:5100
npm ci
npm run dev                  # http://localhost:3000
```

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest (pure logic: stock, cart, colours, series layout) |

The API must be running for the shop to show products (see `server/`).
