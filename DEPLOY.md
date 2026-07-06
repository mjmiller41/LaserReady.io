# DEPLOY.md — LaserReady (instructions for claude-code)

> **Audience: claude-code performing the deploy.** This is the single source of truth for
> deploying LaserReady. Deploy is done from the box via **Hostinger MCP or SSH** (both available).
> LaserReady shares its VPS with a second tenant (LaserKerf) — the **Shared box** section below is
> non-negotiable: follow it or you will break the neighbor.

LaserReady is a **static site** (the validator runs client-side). Deploy = build a static image and
serve it behind the shared reverse proxy. Zero DB, zero host ports.

---

## Shared box — proxy coordination contract (READ FIRST, do not skip)

This Hostinger KVM 2 hosts **two independent tenants**:

| Tenant | Containers | Box path | Internal port range | Public domains |
|---|---|---|---|---|
| **LaserReady** (this repo) | `laserready-web` | `/srv/laserready` | **8100–8199** | `laserready.io`, `www.laserready.io` |
| **LaserKerf** | `laserkerf-web` (later `laserkerf-api`, `laserkerf-redis`) | `/srv/laserkerf` | **8000–8099** | `laserkerf.io`, `www.`, `app.`, (later `api.`, `downloads.`) |

**Shared infrastructure — owned jointly, coordinate before touching:**

- One Docker network literally named **`proxy`** (external). Both tenants attach to it. **Never delete or recreate it.**
- One reverse-proxy container **`shared-caddy`** at `/srv/shared`, owns `:80`/`:443` + TLS. Its `/srv/shared/Caddyfile` holds one hostname block per tenant.
- (LaserKerf Phase B only) one Postgres engine `shared-postgres` — not used by LaserReady.

**Rules claude-code MUST follow when deploying LaserReady:**

1. **Stay in your lane.** Only touch `/srv/laserready` and the `laserready-web` container. Never `stop`/`rm`/`restart` `laserkerf-*`, `shared-caddy`, or `shared-postgres`. Never run `docker compose down` from `/srv/shared` — that drops the proxy for **both** tenants.
2. **Edit the shared Caddyfile additively.** When touching LaserReady's hostname block in `/srv/shared/Caddyfile`, leave LaserKerf's block byte-for-byte intact. Then `caddy validate` and `caddy reload` — **never restart** the `shared-caddy` container (reload is zero-downtime; a restart drops the neighbor).
3. **No published host ports.** Reach the world only through `shared-caddy`. If a host port is ever unavoidable, stay in **8100–8199**.
4. **Never modify LaserKerf's `.env`, files, DB, or containers.**
5. **Snapshot before risky shared changes.** Take a Hostinger VPS snapshot (via the Hostinger MCP) before editing anything under `/srv/shared`.

**After any deploy, confirm you did not harm the neighbor:**

```bash
curl -s -o /dev/null -w 'laserkerf.io %{http_code}\n' https://laserkerf.io   # must still be 200 (or the same as before)
```

---

## Access: Hostinger MCP or SSH

Deployment runs docker/shell commands on the box and occasionally manages DNS or snapshots. Use both:

- **Hostinger MCP (prefer for VPS lifecycle + DNS):** list the VPS to get its IP/status, take a **pre-deploy snapshot**, and manage DNS records. If the Hostinger MCP exposes a run-command / exec tool, you may run the shell steps below through it. Check the connected Hostinger tools first.
- **SSH (for docker/compose):** `ssh <ssh-user>@<box-ip>` then run the commands below. Get `<box-ip>` from the Hostinger MCP (VPS list) or the operator.

Do not fetch or run anything outside these two paths.

---

## One-time setup (skip steps another operator already did)

1. **Shared network** (created once for the whole box):

   ```bash
   docker network ls --format '{{.Name}}' | grep -qx proxy || docker network create proxy
   ```

2. **Shared Caddy** must be up at `/srv/shared` (owned jointly — if it isn't running, coordinate before creating it; see LaserKerf's DEPLOY.md which carries the identical shared-stack definition).

3. **Clone LaserReady:**

   ```bash
   cd /srv && git clone git@github.com:mjmiller41/LaserReady.io.git laserready
   ```

4. **Env** (MailerLite, optional — empty ships capture disabled):

   ```bash
   cd /srv/laserready && cp deploy/.env.example deploy/.env
   # set VITE_ML_ACCOUNT / VITE_ML_FORM_GUARANTEE / VITE_ML_FORM_EARLY (git-ignored, never commit)
   ```

5. **DNS:** ensure `laserready.io` and `www.laserready.io` resolve to the box IP (manage via the Hostinger MCP DNS tools) before the first Caddy reload, so Let's Encrypt can issue.

---

## Deploy / update

```bash
cd /srv/laserready
git pull
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
docker compose -f deploy/docker-compose.yml ps         # laserready-web healthy?
```

The image builds inside a throwaway Node stage (`cpus: 0.50` / `mem_limit: 128m` at runtime). If you must avoid any build load on the box, build locally (`pnpm --filter @laserready/web build`) and rsync `apps/web/dist/` up instead.

**Add/confirm LaserReady's route in the shared Caddy** (only if the hostname block isn't already present). Append to `/srv/shared/Caddyfile`, leaving LaserKerf's block untouched:

```caddy
laserready.io, www.laserready.io {
	encode gzip
	reverse_proxy laserready-web:80
	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "strict-origin-when-cross-origin"
	}
}
```

Then, from the box:

```bash
docker exec shared-caddy caddy validate --config /etc/caddy/Caddyfile
docker exec shared-caddy caddy reload   --config /etc/caddy/Caddyfile   # zero-downtime; never `restart`
```

---

## Verify

```bash
curl -s https://laserready.io | grep -o '<title>[^<]*'          # serves the app
curl -s -o /dev/null -w 'laserkerf.io %{http_code}\n' https://laserkerf.io   # neighbor still 200
```

Then one real end-to-end check in a browser: drop `samples/open-path.svg` on the live site and confirm the **"Not laser-ready — 1 blocker / gap 0.8 mm"** report.

---

## Tag + rollback

```bash
# tag every deploy
git tag -a v0.x.y -m "What this deploy contains" && git push origin --tags

# rollback = redeploy the previous tag (LaserReady only; never touch the neighbor)
git checkout <last-good-tag>
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

hPanel weekly VPS snapshots (managed via the Hostinger MCP) are the catastrophic-case backup for the whole box.

---

## Functional stack files (do not delete — these ARE the deploy)

`deploy/docker-compose.yml` · `deploy/Dockerfile` · `deploy/nginx.conf` · `deploy/Caddyfile.snippet` · `deploy/.env.example`
