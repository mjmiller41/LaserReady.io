# Deploying LaserReady (Phase 0)

Phase 0 is a **static site** — the validator runs in the visitor's browser, so this stack
adds ~zero CPU load to the shared box regardless of traffic. One nginx container, 128 MB,
half a core, published only through the shared Caddy proxy.

Read [`docs/server-cohabitation-plan.md`](../docs/server-cohabitation-plan.md) first —
LaserReady co-tenants the Hostinger KVM 2 with the editor app, and the proxy + Postgres
+ port ranges are shared infrastructure with rules.

## One-time setup on the box

```bash
# 1. Shared proxy network (skip if the editor stack already created it)
docker network create proxy

# 2. Clone
cd /srv && git clone <repo-url> laserready && cd laserready

# 3. MailerLite wiring (optional until Phase 0b goes live)
cp deploy/.env.example deploy/.env && $EDITOR deploy/.env

# 4. Add deploy/Caddyfile.snippet to the SHARED proxy's Caddyfile — coordinate first,
#    the proxy is the one truly shared service. Then reload the proxy:
docker exec shared-caddy caddy reload --config /etc/caddy/Caddyfile
```

DNS: point `laserready.io` (+ `www`) at the box; the shared Caddy handles Let's Encrypt.

## Deploy / update

```bash
cd /srv/laserready
git pull
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

The image builds the site inside a throwaway Node stage (a brief one-core spike; if the
editor is under heavy interactive load, build at a quiet moment or use the local-build
alternative below). Verify:

```bash
docker compose -f deploy/docker-compose.yml ps        # healthy?
curl -s https://laserready.io | grep -o '<title>[^<]*' # serves the app
```

Then run one real end-to-end check in a browser: drop `samples/open-path.svg` on the
live site and confirm the "Not laser-ready — 1 blocker / gap 0.8 mm" report.

## Tag every deploy

```bash
git tag -a v0.x.y -m "What this deploy contains" && git push origin --tags
```

## Alternative: build locally, ship only static files

Zero build load on the box: `pnpm build`, then rsync `apps/web/dist/` to the server and
point the compose file's nginx at it as a bind mount (or any static host — the site is
deploy-target-agnostic; Cloudflare Pages works with build command
`pnpm --filter @laserready/web build`, output `apps/web/dist`).

## Resource contract (from the cohabitation plan)

| Item | Value |
|---|---|
| CPU limit | `cpus: "0.50"` |
| RAM limit | `mem_limit: 128m` (budget allows up to 1.5–2 GB for all of LaserReady later) |
| Host ports | none (proxy network only); range 8100–8199 reserved if ever needed |
| Heavy work | none in Phase 0 — validation is client-side by design |

Phase 1's geometry service will join this compose file as a **queued, concurrency-capped,
CPU-niced** worker per the plan — never inside a blocking web request.

## Rollback

```bash
git checkout <last-good-tag>
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

hPanel weekly VPS snapshots stay enabled as the catastrophic-case backup.
