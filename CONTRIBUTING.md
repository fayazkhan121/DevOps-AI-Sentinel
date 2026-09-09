# Contributing to DevOps AI Sentinel

## Development

1. Copy `env.example` to `.env` and set `JWT_SECRET` and `ENCRYPTION_KEY` (16+ characters).
2. Install dependencies: `npm install`
3. Start API + UI: `npm run dev`
   - API: http://localhost:3000
   - UI: http://localhost:5173 (proxies `/api` to the API)
4. Open the UI and complete first-time setup. The admin password must be at least 8 characters.

## Tests

```bash
npm test
npm run build
npm run lint
```

Add tests next to the behavior you change (`tests/*.test.ts`). Do not add `Math.random()` metric generators; collectors must use OS data or vendor APIs.

## Pull requests

- Keep UI layout/copy unchanged unless the change is requested.
- Do not commit `.env`, database files, or secrets.
- Server code lives in `server/`. The browser client must call `/api/*` instead of pretending to use AWS/K8s SDKs.
