# AURAX API

Backend API for AURAX store (Express + Prisma + PostgreSQL).

## Environment variables

```
DATABASE_URL=postgresql://...
PORT=3000
CORS_ORIGIN=https://aurax.pages.dev
```

## Scripts

- `npm run dev` — local dev with hot reload
- `npm run build` — build to `dist/`
- `npm start` — run the built server
- `npm run db:push` — push schema to DB (no migration files)
- `npm run db:migrate` — apply migrations
- `npm run db:seed` — seed sample data

## Routes

- `GET /api/products` — list products (filters: `category`, `gender`, `search`, `featured`)
- `GET /api/products/:slug` — get by slug
- `POST /api/products` — create
- `PATCH /api/products/:id` — update
- `DELETE /api/products/:id` — delete
- `GET /api/categories` — list
- `POST /api/categories` — create
- `GET /api/orders` — list
- `POST /api/orders` — create with items
- `PATCH /api/orders/:id` — update status
