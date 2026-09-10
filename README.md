# DevOps AI Sentinel

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-green.svg)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg)](https://tailwindcss.com/)

## Overview

DevOps AI Sentinel is a React UI plus an Express API in `server/`.

- The API owns authentication, metric collection, alert evaluation, and notification delivery.
- Application database: SQLite by default; PostgreSQL when `DATABASE_TYPE=postgres` (`pg.Pool`). The setup wizard does not pick the app DB — set it in the environment (`env.example`).
- The UI talks to `/api` and Socket.IO. It does not store passwords or cloud secrets in the browser. There is no IndexedDB/localStorage fake application database.
- Host CPU/memory/disk/network metrics come from the API process (optional remote ingest via `agent/collect.mjs`, including `agent_cpu_usage`). Cloud collectors run only when credentials are saved.
- The web UI is a PWA (`public/manifest.json`). There are no iOS or Android binaries.

## Key Features

### Multi-cloud and host metrics
- AWS (when access keys are set): EC2 inventory, CloudWatch CPU, Cost Explorer, CloudWatch utilization for RDS/Lambda/ALB/S3 when datapoints exist
- Azure: running VM count via ARM when a service principal is configured
- GCP: running instance count when a project access token is configured
- Kubernetes (when configured): pod/node inventory plus node CPU/memory from metrics-server
- Host metrics from the API process: CPU, memory, disk, network, load, uptime
- Remote agent ingest: `agent_cpu_usage` and related host samples from `agent/collect.mjs`
- Retention: 90 days by default (`METRICS_RETENTION_DAYS`, clamped 7–365)

### DevOps tools
When credentials are configured: Kubernetes, Docker, Jenkins, Git (GitHub/GitLab), Prometheus PromQL, Terraform, Ansible, and database probes.

### Alerting
Threshold rules on collected metrics. Delivery when configured: SMTP, Slack, Discord, Telegram, generic webhook, Twilio SMS.

### Auth and tenancy
- bcrypt password hashes, signed JWT sessions, RBAC
- Optional IP allowlist, TOTP, GitHub OAuth, OIDC
- SAML ACS is NameID-only and is **not** XML-DSig verified — use OIDC instead
- First organization: `POST /api/setup`. Additional organizations: authenticated admin `POST /api/orgs` (User Management create-organization dialog)
- Settings primary key `(org_id, key)`. Usernames unique per org
- Invite and password-reset tokens are stored hashed; email is sent when SMTP is configured

### Backups
Org-scoped JSON snapshots via `/api/backups`. This is not a per-tenant filesystem snapshot of SQLite/Postgres and not a physical Postgres dump.

### CI
GitHub Actions runs unit/API tests and a PostgreSQL job (`npm run test:postgres`).

## Architecture

```
┌─────────────────────────────────────────────┐
│           UI (React + Vite :5173)           │
└──────────────────────┬──────────────────────┘
                       │  /api  +  /socket.io
┌──────────────────────▼──────────────────────┐
│     API (Express :3000, SQLite or Postgres) │
│  auth · metrics · alerts · dashboards       │
│  collectors (host + optional vendor APIs)   │
└─────────────────────────────────────────────┘
```

Socket.IO clients join `org:<id>` after JWT auth (`auth.token`). Events: `metrics-update`, `service-health`.

## Getting Started

### Prerequisites

- Node.js 22+
- npm

### Installation

```bash
git clone https://github.com/fayazkhan121/DevOps-AI-Sentinel.git
cd DevOps-AI-Sentinel
cp env.example .env
# set JWT_SECRET and ENCRYPTION_KEY
npm install
npm run dev
```

Open http://localhost:5173 and complete first-time setup (password length at least 8 characters).

The API is http://localhost:3000 (`GET /api/health`).

### Quick Configuration

1. Settings → Advanced: save cloud / Kubernetes / Docker / Jenkins credentials
2. Credentials are encrypted (AES-256-GCM) and stored on the server; collectors run on the API interval
3. Add a notification channel and a matching alert rule

## Testing

```bash
npm test
npm run build
npm run lint
```

PostgreSQL path (matches CI): set `DATABASE_TYPE=postgres` and run `npm run test:postgres`.

## Deployment

### Docker

Compose requires `JWT_SECRET` and `ENCRYPTION_KEY`. Optional profiles: `postgres`, `tls`.

```bash
JWT_SECRET=... ENCRYPTION_KEY=... docker compose up --build
# optional:
# docker compose --profile postgres up --build
# docker compose --profile tls up --build
```

The container serves the production UI from `dist/` on port 3000.

### Production (without Docker)

```bash
npm run build
NODE_ENV=production PORT=3000 npm start
```

## REST API

- `GET /api/health`
- `POST /api/setup` `POST /api/auth/login` `POST /api/auth/logout`
- `POST /api/orgs` (authenticated admin) `GET /api/orgs/current`
- `GET /api/metrics` `GET /api/metrics/latest` `POST /api/metrics/collect`
- `GET /api/alerts` `POST /api/alerts/:id/ack` `POST /api/alerts/:id/resolve`
- `GET|POST /api/dashboards` `GET /api/dashboards/:id/export`
- `GET|POST /api/integrations`
- `GET|POST /api/backups` `POST /api/backups/:id/restore`
- `POST /api/agents/ingest` (header `X-Agent-Key`)
- `GET /api/reports/compliance?format=csv|json`

## Host agent

```bash
SENTINEL_URL=http://localhost:3000 AGENT_KEY=... node agent/collect.mjs
```

Create a key with `POST /api/agents/keys` as an admin. Ingested samples include `agent_cpu_usage`.

## Remaining (not in this product)

- Native iOS/Android
- XML-DSig SAML (use OIDC)
- Vulnerability scanning / cost-optimization engines
- HA, SCIM
- Per-tenant physical Postgres dumps

## License

MIT — see [LICENSE](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
