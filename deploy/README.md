# GitHub Actions deployment

Workflow: `.github/workflows/deploy.yml`. Pull requests validate and build an unpublished image; pushes to `main` validate, publish an immutable GHCR image, and deploy through the `production` GitHub Environment. `workflow_dispatch` is validation-only.

## GitHub configuration

Create the `production` environment and configure:

| Name | Type | Purpose |
|---|---|---|
| `DEPLOY_HOST` | Variable | Server hostname/IP |
| `DEPLOY_PORT` | Variable, optional | SSH port; defaults to `22` |
| `DEPLOY_PATH` | Variable, optional | Dedicated remote directory; defaults to `/opt/production/video-web` |
| `DEPLOY_USER` | Secret, optional | SSH account; defaults to `root` (prefer a dedicated least-privilege account) |
| `DEPLOY_SSH_PRIVATE_KEY` | Secret | Private key authorized for deployment |
| `DEPLOY_KNOWN_HOSTS` | Secret | Pre-verified SSH host key line(s) |

Enable Actions `GITHUB_TOKEN` package write access. The workflow publishes to `ghcr.io/<owner>/<repository>`. Ensure the package is readable by the token used by the server; for a private package, a dedicated least-privilege read token may be needed on the server.

Protect `main` and optionally configure production environment reviewers. If `DEPLOY_USER` is omitted, the workflow connects as `root`; root SSH login and its `authorized_keys` must be configured. Prefer setting a dedicated least-privilege user Secret instead. `DEPLOY_PORT` defaults to `22`, and `DEPLOY_PATH` defaults to `/opt/production/video-web`.

## Server prerequisites

- Docker Engine and Docker Compose v2 installed; SSH account can use Docker.
- Create the external Docker network `1panel-network`. The backend API must be joined to this network so Nuxt can reach it by container DNS name.
- Create `$DEPLOY_PATH/.env.production` with mode `0600`. Configure `NUXT_API_BASE_URL` to the backend's address on the shared Docker network (for example `http://budang-api:3000`), and set `NUXT_PUBLIC_SITE_URL` to the public HTTPS origin.
- Configure the reverse proxy/TLS and firewall. Host port defaults to `9890` (`APP_PORT` can be set in `.env.production`).

The workflow uploads `compose.prod.yml` to the dedicated deployment directory. Existing container name must be `budang-web` for health checks and rollback detection. The Docker healthcheck checks `/health`.

## Deployment behavior

Images use immutable `<commit-sha>-<run-id>-<run-attempt>` tags. PR builds cannot publish/deploy. Deployments are serialized; the script verifies SSH host keys and deployment arguments, waits for container health, and attempts to restore the previous image on failure. No application secrets are sent through the workflow to the container.
