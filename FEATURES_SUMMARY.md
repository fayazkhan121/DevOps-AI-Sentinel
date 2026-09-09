# Features (honest)

This repository now includes a Node API and a React UI.

## Implemented on the API
- SQLite application database
- bcrypt + JWT authentication, lockout, RBAC, audit log
- AES-256-GCM for stored integration secrets
- Host metric collection (CPU, memory, disk, network, load, uptime)
- Optional live collectors: AWS, Azure, GCP, Kubernetes, Docker, Jenkins, GitHub/GitLab, Prometheus
- Alert rules + email/Slack/Discord/Telegram/webhook/SMS delivery when those channels are configured
- Dashboard CRUD, export/import
- Socket.IO metric stream
- Agent ingest (`agent/collect.mjs`)
- Compliance report JSON/CSV
- GitHub OAuth SSO when client id/secret are set
- IP allowlist
- Rate limiting, Helmet, CORS
- Docker / Compose / GitHub Actions CI / unit+API tests

## UI
- Existing screens call `/api` instead of localStorage mock generators
- Overview KPIs, alerts, graphs, anomalies, and service health bind to API data
- First-time setup creates the admin on the server (password ≥ 8 characters)

## Not a native mobile app
The web UI is installable as a PWA (`public/manifest.json`). There is no iOS/Android binary.

## Cloud data
If a provider is not configured, that provider shows as disconnected and contributes no fake inventory.
