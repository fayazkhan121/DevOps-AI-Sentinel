# Security

- Report vulnerabilities privately to the repository maintainers.
- Production deployments MUST set unique `JWT_SECRET` and `ENCRYPTION_KEY` (Compose requires both).
- Credentials for cloud and DevOps tools are stored server-side with AES-256-GCM. Never put long-lived keys in the browser.
- First org is created by `POST /api/setup` (no default `admin/admin` account). Additional orgs are created by an authenticated admin via `POST /api/orgs`.
- SAML ACS parses NameID from the assertion and does not verify XML-DSig. Prefer OIDC. Invite and password-reset tokens are stored hashed.
