# Features (honest)

React UI plus Express API (`server/`). Application DB is SQLite by default, or PostgreSQL when `DATABASE_TYPE=postgres` (`pg.Pool`). The setup wizard does not choose the app DB; the environment does.

## Implemented on the API
- bcrypt + JWT, lockout, RBAC, audit log, optional IP allowlist, TOTP
- GitHub OAuth and OIDC when configured. SAML ACS is NameID-only and is not XML-DSig verified — use OIDC
- AES-256-GCM for stored integration secrets
- First org: `POST /api/setup`. Additional orgs: authenticated admin `POST /api/orgs`
- Settings PK `(org_id, key)`. Usernames unique per org. Socket.IO rooms `org:<id>`
- Host metrics from the API process (CPU, memory, disk, network, load, uptime)
- Remote agent ingest (`agent/collect.mjs`), including `agent_cpu_usage`
- Cloud collectors only with credentials:
  - AWS: EC2 inventory, CloudWatch CPU, Cost Explorer, CloudWatch utilization for RDS/Lambda/ALB/S3 when datapoints exist
  - Azure: running VM count via ARM
  - GCP: running instance count
- Kubernetes when configured: pod/node inventory plus node CPU/memory from metrics-server
- Other collectors when configured: Docker, Jenkins, Git, Prometheus PromQL, Terraform, Ansible, database probes
- Metric retention default 90 days (`METRICS_RETENTION_DAYS` 7–365)
- Alert rules + SMTP / Slack / Discord / Telegram / webhook / Twilio when configured
- Dashboard CRUD, export/import
- Org-scoped JSON snapshots via `/api/backups` (not per-tenant filesystem snapshots or physical Postgres dumps)
- Invite and password-reset tokens hashed; email sent when SMTP is configured
- Compliance report JSON/CSV
- Rate limiting, Helmet, CORS
- Docker Compose requires `JWT_SECRET` and `ENCRYPTION_KEY`; optional profiles `postgres` and `tls`
- GitHub Actions CI: unit/API tests plus a PostgreSQL job (`npm run test:postgres`)

## UI
- Screens call `/api`. A session token may be stored in localStorage; there is no IndexedDB/localStorage fake application database
- Unused mock, security-scan, and cost-optimization services are removed. Stub Security/Cost UI is not shipped
- Overview KPIs, alerts, graphs, anomalies, and service health bind to API data
- First-time setup creates the first org admin on the server (password ≥ 8 characters)
- User Management includes a create-organization dialog (`POST /api/orgs`)

## Not a native mobile app
The web UI is installable as a PWA (`public/manifest.json`). There is no iOS/Android binary.

## Cloud data
If a provider is not configured, that provider shows as disconnected and contributes no fake inventory.

## Remaining (not in this product)
- Native iOS/Android
- XML-DSig SAML (use OIDC)
- Vulnerability scanning / cost-optimization engines
- HA, SCIM
- Per-tenant physical Postgres dumps
