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
- **Docker**: set `AUDIO_URL`, `CALENDAR_URL`, `IMAGE_URL`, `MASTER_URL` as container
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
  ai-agent-webapp
```

Or simply `docker compose up --build` from the repo root, which wires this up alongside all
four backend services.

## Type-check / build

```bash
npm install
npm run build
```
