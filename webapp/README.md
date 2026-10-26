# AI Agent Platform - Web App

React + TypeScript (Vite) dashboard for the four AI agent microservices: upload/manage audio
and image files, manage calendar events/reservations, and a master control panel to
enable/disable/restart each backend service. Every page also has a chat box wired to that
service's `/agent/chat` endpoint.

This folder is self-contained so it can be extracted into its own git repository later with
no code changes. See `/MIGRATION.md` at the repo root for the extraction steps.

## Configuring backend URLs

Two different mechanisms, because a Docker image is a fixed build artifact and can't bake in
environment-specific URLs:

- **Local dev** (`npm run dev`): copy `.env.example` to `.env.local` and set `VITE_*` vars -
  Vite inlines these at dev-server/build time.
- **Docker**: set `AUDIO_URL`, `CALENDAR_URL`, `IMAGE_URL`, `PIZZA_URL`, `MASTER_URL` as container
  environment variables (see root `docker-compose.yml`). `docker-entrypoint.sh` renders
  `public/config.template.js` into `/config.js` at container start, which the app reads via
  `window.__ENV__` before falling back to the Vite build-time values.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Run with Docker

```bash
docker build -t ai-agent-webapp .
docker run -p 8080:80 \
  -e AUDIO_URL=http://localhost:8001 \
  -e CALENDAR_URL=http://localhost:8003 \
  -e IMAGE_URL=http://localhost:8002 \
  -e MASTER_URL=http://localhost:8000 \
  -e PIZZA_URL=http://localhost:8004 \
  ai-agent-webapp
```

Or simply `docker compose up --build` from the repo root, which wires this up alongside all
backend services.

## Service status lights

The header carries one pill per backend service, each with a traffic-light dot:

| Dot | State | What it means |
| --- | --- | --- |
| 🟢 | `online` | `GET /health` answered `200`. |
| 🟠 | `degraded` | The service answered, but not with a `200` - it is up and unwell. |
| 🔴 | `offline` | The connection failed, or no reply arrived within 4s. |
| ⚪ | `checking` | First sweep still in flight. |

Every service is probed directly (not through master-service), so the lights stay honest even
when master-service itself is the one that is down. The sweep repeats every 15 seconds; the
URLs come from the same config as the rest of the app, so a pill's tooltip shows exactly which
endpoint was polled. Adding a service to `SERVICES` in `src/serviceHealth.ts` adds its light.

## Type-check / build

```bash
npm install
npm run build
```
