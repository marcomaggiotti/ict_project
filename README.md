# ICT Project - AI Agent Microservices Platform

A small platform of Python/FastAPI "AI agent" microservices, a master orchestrator, a web
app, and a mobile app, all containerized with Docker.

Everything currently lives in this one repository as **self-contained, independently
deployable folders** (own dependencies, Dockerfile, `.env.example`, README, no cross-folder
imports) so each can be split into its own git repository later with zero code changes -
see [`MIGRATION.md`](./MIGRATION.md).

## Components

| Folder                          | What it is                                                              | Port (via root compose) |
|----------------------------------|--------------------------------------------------------------------------|--------------------------|
| `services/audio-service`        | AI agent microservice: store/manage audio files                          | 8001                     |
| `services/image-service`        | AI agent microservice: store/manage image files                          | 8002                     |
| `services/calendar-service`     | AI agent microservice: timeplans, calendar events, resource reservations | 8003                     |
| `services/master-service`       | Master AI agent: enables/disables/restarts the other services via Docker | 8000                     |
| `webapp`                        | React + TypeScript dashboard for all of the above                        | 8080                     |
| `mobile-app`                    | Expo (React Native + TypeScript) app mirroring the web dashboard          | n/a (installed on device)|

Each microservice exposes plain REST CRUD endpoints **and** a `/agent/chat` endpoint: a small
LLM agent (Anthropic tool-calling) that can carry out the same operations from a
natural-language instruction (e.g. "list yesterday's uploads", "book conference-room-a
tomorrow 2-3pm", "turn off the image service").

## Architecture

```
                     ┌───────────────┐        ┌───────────────┐
                     │   webapp      │        │  mobile-app   │
                     │  (React/Vite) │        │ (Expo/RN)     │
                     └───────┬───────┘        └───────┬───────┘
                             │      REST + /agent/chat │
              ┌──────────────┼──────────────┬──────────┘
              ▼              ▼              ▼
      ┌───────────────┐┌───────────────┐┌───────────────┐      ┌───────────────────┐
      │ audio-service ││image-service  ││calendar-service│      │  master-service    │
      │ (FastAPI)     ││(FastAPI)      ││(FastAPI)       │◄────►│  (FastAPI + Docker │
      └───────┬───────┘└───────┬───────┘└───────┬───────┘      │   Engine API)      │
              │                │                │              └─────────┬──────────┘
              └────────────────┴────────────────┘                        │
                       Postgres (Render-compatible)               controls container
                       or Azure Cosmos DB, per service             start/stop/restart
```

## Data backends

Every microservice can run against, per its own `DB_BACKEND` setting:

- **sqlite** (default) - zero-config local file DB.
- **postgres** - any Postgres-wire-compatible database, including a
  [Render managed Postgres](https://render.com/pricing#postgresql) instance (just point
  `POSTGRES_URL` at Render's connection string).
- **cosmos** - [Azure Cosmos DB](https://azure.microsoft.com/products/cosmos-db) (NoSQL API).

## Running the whole platform

```bash
cp .env.example .env    # fill in ANTHROPIC_API_KEY and any API keys you want to require
docker compose up --build
```

This starts a local Postgres (with one database per service), all four microservices, and
the web app, all on one Docker network. Open the web app at http://localhost:8080.

Each service also has its own standalone `docker-compose.yml` for running/developing it in
isolation - see that service's README.

## Running the mobile app

```bash
cd mobile-app
npm install
npx expo start
```

See `mobile-app/README.md` for pointing it at your running backend.

## Security notes

- `master-service` controls the Docker daemon (via `/var/run/docker.sock`) to
  enable/disable/restart the other containers - **always set `MASTER_API_KEY`** outside of
  local dev, and see `services/master-service/README.md` for hardening options.
- All mutating REST endpoints and `/agent/chat` on every service accept an `X-API-Key`
  header, enforced when that service's `API_KEY` env var is set (empty = auth disabled, for
  local dev only).

## Repo layout

```
services/
  audio-service/       FastAPI AI agent - audio files
  image-service/        FastAPI AI agent - image files
  calendar-service/     FastAPI AI agent - calendar/reservations
  master-service/       FastAPI AI agent - orchestrator
webapp/                 React + TypeScript dashboard
mobile-app/              Expo (React Native) app
infra/postgres-init/     Multi-database init script for the local Postgres container
docker-compose.yml       Top-level orchestration for the whole platform
MIGRATION.md             How to split folders into separate repos later
```
