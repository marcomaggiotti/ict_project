# Image Service (AI Agent)

FastAPI microservice that stores and manages image files, with a built-in AI agent
endpoint (`/agent/chat`) that can list/inspect/delete files from a natural-language
instruction via Anthropic tool-calling.

This folder is self-contained (own dependencies, Dockerfile, config) so it can be
extracted into its own git repository later with no code changes. See `/MIGRATION.md`
at the repo root for the extraction steps.

## Endpoints

| Method | Path                   | Description                              |
|--------|------------------------|-------------------------------------------|
| GET    | `/health`              | Liveness check                            |
| POST   | `/image`               | Upload an image file (multipart, `tags` optional CSV) |
| GET    | `/image`               | List image metadata (`limit`, `offset`)   |
| GET    | `/image/{id}`          | Get metadata for one file                 |
| GET    | `/image/{id}/download` | Download the raw image bytes              |
| DELETE | `/image/{id}`          | Delete a file                             |
| POST   | `/agent/chat`          | Natural-language agent chat over the data |

All endpoints except `/health` require header `X-API-Key` if `API_KEY` is set in the
environment; leave it empty for local dev.

## Configuration

Copy `.env.example` to `.env` and adjust. Key setting: `DB_BACKEND`:

- `sqlite` (default) - zero-config local file DB, good for quick local runs.
- `postgres` - any Postgres-wire-compatible database, including a **Render**
  [managed Postgres](https://render.com/pricing#postgresql) instance - just set
  `POSTGRES_URL` to Render's external connection string.
- `cosmos` - **Azure Cosmos DB** (NoSQL API). Note Cosmos documents are capped at 2MB,
  which bounds file size when stored this way; fine for a demo/scaffold, use blob
  storage for production-scale files.

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
