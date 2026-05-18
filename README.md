# Prowider Mini Lead Distribution System

A full-stack Next.js application that distributes incoming service leads to providers using a deterministic round-robin allocation algorithm with PostgreSQL `SELECT FOR UPDATE` locking for concurrency safety.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma 7
- **Real-time**: Server-Sent Events (SSE) with polling fallback
- **Styling**: Tailwind CSS

## Features

- Lead submission with automatic provider allocation
- Round-robin fair distribution with mandatory provider assignments
- Concurrency-safe allocation using `SELECT FOR UPDATE` row-level locking
- Real-time dashboard updates via SSE (falls back to 3s polling)
- Idempotent quota reset webhook
- Bulk lead generator for concurrency testing
- Duplicate lead prevention at the database level (`@@unique([phone, serviceId])`)

## Prerequisites

- Node.js 18+
- PostgreSQL 14+ (or Docker)
- npm

## Setup

### 1. Clone repo

```bash
git clone <repo-url>
cd prowider-lead-distribution
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PostgreSQL

**Option A: Docker (recommended)**

```bash
docker compose up -d
```

**Option B: Manual Docker command**

```bash
docker run --name prowider-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=prowider_leads -p 5432:5432 -d postgres:16
```

**Option C: Existing PostgreSQL**

Create a database named `prowider_leads` on your existing PostgreSQL instance.

### 4. Configure environment

```bash
cp .env.example .env
```

The default `.env` values work with the Docker setup:

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/prowider_leads?schema=public
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Run database migrations

```bash
npx prisma migrate dev --name init
```

### 6. Seed the database

```bash
npx prisma db seed
```

This creates:
- 3 services: Service 1, Service 2, Service 3
- 8 providers: Provider 1 through Provider 8 (monthlyQuota=10)
- 3 allocation states with pool configuration

### 7. Start the development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Pages

| Route | Description |
|---|---|
| `/` | Landing page with navigation |
| `/request-service` | Submit a new service lead |
| `/dashboard` | Real-time provider dashboard (auto-updates via SSE) |
| `/test-tools` | Quota reset + bulk lead generator for testing |

## API Routes

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/leads` | Create a lead and allocate providers |
| `GET` | `/api/providers` | Get all providers with quota stats and assignments |
| `GET` | `/api/sse` | SSE stream for real-time updates |
| `POST` | `/api/webhook/quota-reset` | Reset provider quotas (idempotent) |
| `POST` | `/api/test/bulk-leads` | Generate 10 concurrent leads for testing |

## Business Rules

### Mandatory Assignments

Each lead must be assigned to **exactly 3 providers**. Mandatory providers are assigned first:

| Service | Mandatory Providers |
|---|---|
| Service 1 | Provider 1 |
| Service 2 | Provider 5 |
| Service 3 | Provider 1, Provider 4 |

### Fair Pool (Round-Robin)

After mandatory providers, remaining slots are filled from the fair pool:

| Service | Fair Pool |
|---|---|
| Service 1 | [2, 3, 4] |
| Service 2 | [6, 7, 8] |
| Service 3 | [2, 3, 5, 6, 7, 8] |

### Quota

- Each provider has a `monthlyQuota` (default: 10)
- Mandatory providers respect quota limits — if over quota, they are skipped
- Fair pool providers are skipped when over quota
- Quota can only be reset via the `/api/webhook/quota-reset` endpoint

### Concurrency

The allocation function uses `SELECT FOR UPDATE` on the `AllocationState` row inside a Prisma interactive transaction. This ensures:

- Only one transaction modifies the round-robin index at a time per service
- Provider quota is checked and incremented atomically
- No double-assignments under concurrent load
- Different services can allocate concurrently (different rows locked)

### Idempotency

The quota reset webhook uses an `idempotencyKey` stored in the `WebhookEvent` table. Calling the endpoint with the same key twice returns `"Already processed"` without repeating the operation.

## Deployment (Vercel + Supabase/Railway)

1. Push to GitHub
2. Import in Vercel
3. Set `DATABASE_URL` environment variable to your hosted PostgreSQL connection string
4. After first deploy, run:
   ```bash
   npx prisma migrate deploy
   npx prisma db seed
   ```

Note: SSE works in single-process mode. On Vercel serverless, the dashboard falls back to polling every 3 seconds.
