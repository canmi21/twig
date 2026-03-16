# Taki

My personal website, and just for fun.

## Commands

```bash
bun install
bun run dev
bun run build
bun run lint
```

## Project Structure

- `src/routes`: app routes and route-level UI
- `src/features`: feature-scoped UI, utilities, and server functions
- `src/shared`: truly shared primitives and helpers
- `src/server`: server-side code
- `src/server/database`: Drizzle schema and database access
- `src/server/functions`: server functions
- `public`: static assets

## Tech Stack

- TanStack Start
- React SSR
- Vite 8
- Bun
- Tailwind CSS
- shadcn/ui
- lucide-react
- Cloudflare Workers
- Cloudflare D1, R2, and KV
- Drizzle ORM

## License

AGPL-v3 License © 2026 [Canmi](https://github.com/canmi21)
