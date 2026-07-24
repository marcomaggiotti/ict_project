# Calendar Service (AI Agent)

FastAPI microservice that manages timeplans, calendar events and resource reservations,
with a built-in AI agent endpoint (`/agent/chat`) that can create/list/cancel events from a
natural-language instruction via Anthropic tool-calling. Reservations (`kind=reservation`
with a `resource`) are conflict-checked against overlapping time ranges on the same resource.

This folder is self-contained (own dependencies, Dockerfile, config) so it can be
extracted into its own git repository later with no code changes. See `/MIGRATION.md`
at the repo root for the extraction steps.

## Endpoints

| Method | Path                  | Description                                    |
|--------|-----------------------|-------------------------------------------------|
| GET    | `/health`             | Liveness check                                  |
| POST   | `/events`             | Create an event or reservation                  |
| GET    | `/events`             | List events (`limit`, `offset`, `start`, `end`) |
| GET    | `/events/{id}`        | Get a single event                              |
| POST   | `/events/{id}/cancel` | Cancel an event (soft delete, keeps history)     |
| DELETE | `/events/{id}`        | Hard-delete an event                            |
| POST   | `/agent/chat`         | Natural-language agent chat over the data       |

Creating a `reservation` with an overlapping `resource`/time range returns `409 Conflict`
with the list of conflicting events.

All endpoints except `/health` require header `X-API-Key` if `API_KEY` is set in the
environment; leave it empty for local dev.

## Configuration

Copy `.env.example` to `.env` and adjust. Key setting: `DB_BACKEND`:

- `sqlite` (default) - zero-config local file DB, good for quick local runs.
- `postgres` - any Postgres-wire-compatible database, including a **Render**
  [managed Postgres](https://render.com/pricing#postgresql) instance - just set
  `POSTGRES_URL` to Render's external connection string.
- `cosmos` - **Azure Cosmos DB** (NoSQL API).

`ANTHROPIC_API_KEY` enables `/agent/chat`; without it the endpoint returns a message
saying the key is missing instead of erroring.

## Run locally

```bash
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload
```

## Run with Docker

```bash
docker compose up --build
# or, with a local Postgres too:
docker compose --profile postgres up --build
```

## Tests

```bash
pip install -r requirements-dev.txt
pytest
```
