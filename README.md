# Rampart Web

The RPI Ambulance member portal frontend (members.rpiambulance.com). Next.js (App Router) + Tailwind + shadcn/ui. All data comes from the `rampart-api` service; this app holds no database.

**Spec:** `docs/modernization-spec.md` in the legacy `website` repo.

## Auth

Keycloak OIDC via Auth.js (`src/auth.ts`) — authentication only. The Keycloak access token is kept in the session and forwarded to the API by the server-side client in [`src/lib/api.ts`](src/lib/api.ts); the API decides authorization from its roles/permissions model. Inactive members get a "contact an officer" screen (the API returns 403 `INACTIVE_MEMBER`).

## Run locally — the whole platform in Docker

With `rampart-api` checked out as a sibling directory (its compose stack is
`include:`d by this repo's [docker-compose.yml](docker-compose.yml)):

```bash
docker compose up -d --build   # web :3000, API :3001, Keycloak :8080, Postgres :5433
docker compose run --rm seed   # reference data + dev member
```

**Signing in without touching Keycloak:** the compose stack sets
`AUTH_DEV_LOGIN=true`, which puts a username/password form on the dashboard
(default `dev` / `dev`). It exchanges credentials for a real Keycloak token
server-side over the container network — no browser redirect, no `/etc/hosts`
entry. Never enable in production.

The full OIDC redirect flow also works if you want to exercise it: add
`127.0.0.1 keycloak` to `/etc/hosts`, then use the header "Sign in" button.

## Development (web on the host)

```bash
cp .env.example .env          # fill in Keycloak client + AUTH_SECRET (npx auth secret)
npm run dev                   # app on :3000, expects rampart-api on :3001
```

shadcn/ui components live in `src/components/ui` — add more with `npx shadcn@latest add <component>`.

## Deploy

```bash
cp scripts/.env.deploy.example scripts/.env.deploy   # registry + Coolify values
./scripts/deploy.sh            # builds linux/amd64 (standalone output), pushes, triggers Coolify redeploy
```
