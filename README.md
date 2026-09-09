# DevOps AI Sentinel - Enterprise Monitoring & Alerting Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-green.svg)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg)](https://tailwindcss.com/)

## Overview

DevOps AI Sentinel is a monitoring and alerting platform for DevOps teams. It is a React UI plus a Node.js API.

- The **API** (`server/`) owns authentication, SQLite storage, metric collection, alert evaluation, and notification delivery.
- The **UI** talks to `/api` and a Socket.IO stream. It does not store passwords or cloud secrets in the browser.
- Host CPU/memory/disk/network metrics are collected from the machine running the API. AWS, Azure, GCP, Kubernetes, Docker, Jenkins, Git, and Prometheus are queried only when you save working credentials.

## Key Features

### Multi-Cloud Monitoring
- AWS: EC2 inventory and CloudWatch CPU when access keys are configured
- Azure: VM inventory via ARM when a service principal is configured
- GCP: instance count when a project access token is configured
- Host metrics: CPU, memory, disk, network, load, uptime from the API process

### DevOps Tools Integration
- Kubernetes, Docker, Jenkins, GitHub/GitLab, Prometheus — live queries when credentials exist
- Terraform and Ansible settings forms can be stored as integrations; extend `server/collectors.ts` to add vendor-specific scrapes

### Database
- Application database: SQLite (server-side, WAL mode)
- Secrets at rest: AES-256-GCM

### Alerting
- Threshold rules evaluated on collected metrics
- Channels: email (SMTP), Slack, Discord, Telegram, generic webhook, Twilio SMS
- Acknowledge/resolve in the API; audit log for delivery failures

### Dashboards
- CRUD dashboards stored in SQLite
- Export/import JSON
- Live charts from `/api/metrics` and Socket.IO `metrics-update`

### Security
- bcrypt password hashes, signed JWT sessions
- Role-based permissions enforced on the API
- Optional IP allowlist
- Optional GitHub OAuth SSO
- Agent ingest endpoint with hashed API keys
- Rate limiting and Helmet

## Architecture

```
┌─────────────────────────────────────────────┐
│           UI (React + Vite :5173)           │
└──────────────────────┬──────────────────────┘
                       │  /api  +  /socket.io
┌──────────────────────▼──────────────────────┐
│        API (Express + SQLite :3000)         │
│  auth · metrics · alerts · dashboards       │
│  collectors (host + optional vendor APIs)   │
└─────────────────────────────────────────────┘
```

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
2. Credentials are encrypted and stored on the server; collectors run on the API interval
3. Add a notification channel and a matching alert rule

## Testing

```bash
npm test
npm run build
npm run lint
```

## Deployment

### Docker

```bash
docker compose up --build
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
- `GET /api/metrics` `GET /api/metrics/latest` `POST /api/metrics/collect`
- `GET /api/alerts` `POST /api/alerts/:id/ack` `POST /api/alerts/:id/resolve`
- `GET|POST /api/dashboards` `GET /api/dashboards/:id/export`
- `GET|POST /api/integrations`
- `POST /api/agents/ingest` (header `X-Agent-Key`)
- `GET /api/reports/compliance?format=csv|json`

### WebSocket (Socket.IO)

Authenticate with the JWT in `auth.token`. Events: `metrics-update`, `service-health`.

## Host agent

```bash
SENTINEL_URL=http://localhost:3000 AGENT_KEY=... node agent/collect.mjs
```

Create a key with `POST /api/agents/keys` as an admin.

## License

MIT — see [LICENSE](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
