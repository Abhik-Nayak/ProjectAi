# AI Docs Chat — Progress Tracker

## Phase 0: Foundation & File Upload Pipeline

**Status**: Complete
**Date**: 2026-05-22

---

### Architecture

```
ai-docs-chat/                     # pnpm monorepo
├── apps/
│   ├── web/                      # Next.js 14 (App Router, TypeScript)
│   │   ├── src/app/              # Root layout + home page
│   │   ├── src/components/       # FileUpload (drag+drop) + DocumentList
│   │   └── src/lib/api.ts        # Typed fetch wrappers for backend
│   └── api/                      # NestJS backend (TypeScript)
│       └── src/
│           ├── document/         # Upload controller, service, entity
│           └── health/           # GET /api/health
├── packages/
│   └── shared/                   # Shared types, DTOs, constants (CommonJS output)
├── docker-compose.yml            # pgvector:pg16 + redis:7-alpine
├── pnpm-workspace.yaml
├── tsconfig.base.json            # Strict base config
└── .env                          # Local env vars (not committed)
```

### Stack

| Layer      | Technology              | Notes                              |
|------------|------------------------|------------------------------------|
| Frontend   | Next.js 14 (App Router) | CSS Modules, no extra UI deps     |
| Backend    | NestJS 10              | Global prefix `/api`               |
| Database   | PostgreSQL 18          | Running locally on port 5434       |
| ORM        | TypeORM                | `synchronize: true` (dev only)     |
| File Store | Local disk (`./uploads`) | Multer with UUID filenames        |
| Shared     | `@ai-docs-chat/shared` | `workspace:*`, must build before dev |
| Queue      | **Deferred**           | BullMQ/Redis removed for now       |

### API Endpoints

| Method | Endpoint                    | Description                                      |
|--------|-----------------------------|--------------------------------------------------|
| GET    | `/api/health`               | Returns `{ status: "ok", timestamp }`            |
| POST   | `/api/documents/upload`     | Multipart upload (field: `file`). Accepts PDF, TXT, MD, DOCX. Max 50 MB |
| GET    | `/api/documents`            | List all documents, newest first                 |
| GET    | `/api/documents/:id`        | Get single document by UUID                      |

### Database Schema (documents table)

| Column      | Type         | Notes                         |
|-------------|-------------|-------------------------------|
| id          | UUID (PK)   | Auto-generated                |
| filename    | varchar     | Original upload name          |
| mimeType    | varchar     | Validated against allowlist   |
| sizeBytes   | bigint      |                               |
| status      | varchar     | pending / processing / ready / failed |
| chunkCount  | int         | Default 0 (no chunking yet)   |
| storagePath | varchar     | Disk path to uploaded file    |
| createdAt   | timestamp   | Auto                          |
| updatedAt   | timestamp   | Auto                          |

### Shared Package (`@ai-docs-chat/shared`)

- `DocumentStatus` enum: `PENDING`, `PROCESSING`, `READY`, `FAILED`
- `Document` interface (full entity shape)
- `UploadResponseDto` — returned after upload
- `DocumentListItemDto` — returned in list endpoint
- `ALLOWED_MIME_TYPES` — `application/pdf`, `text/plain`, `text/markdown`, DOCX

### Key Config Decisions

- **No Redis**: BullMQ removed to run without Docker. Uploads save directly as `READY`.
- **envFilePath**: `ConfigModule` points to monorepo root `.env` via relative path from `dist/`.
- **shared emits CommonJS**: Node 24 strict ESM resolution broke extensionless imports; switched to CJS.
- **PostgreSQL port 5434**: Local PG 18 instance, not default 5432.
- **`synchronize: true`**: Auto-creates tables in dev. Must switch to migrations before prod.

### Local Dev Setup

```bash
cd ai-docs-chat
cp .env.example .env          # Edit to match local PG credentials
pnpm install
pnpm --filter @ai-docs-chat/shared build
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001

### .env Variables

```
POSTGRES_HOST=localhost
POSTGRES_PORT=5434
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=aidocs_chat
REDIS_HOST=localhost        # Not used currently
REDIS_PORT=6379             # Not used currently
API_PORT=3001
API_CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
UPLOAD_MAX_SIZE_MB=50
UPLOAD_DIR=./uploads
```

---

## Not Yet Implemented (Future Phases)

- [ ] Redis + BullMQ async document processing
- [ ] Text extraction (PDF, DOCX parsing)
- [ ] Chunking strategy (split documents into passages)
- [ ] Embedding generation (OpenAI / local model)
- [ ] pgvector extension + vector storage
- [ ] Semantic search endpoint
- [ ] Chat interface with RAG pipeline
- [ ] Authentication / authorization
- [ ] Production Docker setup (multi-stage builds)
