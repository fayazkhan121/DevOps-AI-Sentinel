# Security

- Report vulnerabilities privately to the repository maintainers.
- Production deployments MUST set unique `JWT_SECRET` and `ENCRYPTION_KEY`.
- Credentials for cloud and DevOps tools are stored server-side with AES-256-GCM. Never put long-lived keys in the browser.
- First-time setup creates the only initial admin. There is no default `admin/admin` account.
