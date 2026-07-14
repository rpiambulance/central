# Rampart Web

The RPI Ambulance member portal frontend (members.rpiambulance.com). Next.js (App Router) + Tailwind + shadcn/ui. All data comes from the `rampart-api` service; this app holds no database.

**Spec:** `docs/modernization-spec.md` in the legacy `website` repo.

## Auth

Keycloak OIDC via Auth.js (`src/auth.ts`) — authentication only. The Keycloak access token is kept in the session and forwarded to the API by the server-side client in [`src/lib/api.ts`](src/lib/api.ts); the API decides authorization from its roles/permissions model. Inactive members get a "contact an officer" screen (the API returns 403 `INACTIVE_MEMBER`).

## Development

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
