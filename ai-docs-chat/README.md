# AI Docs Chat

RAG-powered documentation chat application.

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Docker & Docker Compose

## Quick Start

```bash
# 1. Clone and install
cd ai-docs-chat
cp .env.example .env
pnpm install

# 2. Start infrastructure (PostgreSQL + Redis)
pnpm docker:up

# 3. Build shared package first
pnpm --filter @ai-docs-chat/shared build

# 4. Start dev servers
pnpm dev
```

- **Web**: http://localhost:3000
- **API**: http://localhost:3001
- **Health check**: http://localhost:3001/api/health

## Project Structure

```
apps/
  web/     Next.js 14 frontend (App Router)
  api/     NestJS backend
packages/
  shared/  Shared TypeScript types and DTOs
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all packages |
| `pnpm docker:up` | Start PostgreSQL & Redis |
| `pnpm docker:down` | Stop infrastructure |
| `pnpm typecheck` | Type-check all packages |

## Architecture (Phase 0)

Upload pipeline: **Browser → NestJS (multer) → PostgreSQL (metadata) + disk (file) → BullMQ job → processor stub**

The document processor is a stub in Phase 0. Phase 1 will add text extraction, chunking, and embedding via pgvector.
