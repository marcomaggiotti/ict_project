# Master Service (AI Agent Orchestrator)

FastAPI microservice that acts as the **master agent**: it manages (enables/disables/restarts)
the audio, calendar and image microservices by talking to the Docker Engine API. It also
exposes a natural-language `/agent/chat` endpoint so the same actions can be driven by an
instruction like "turn off the image service".

This folder is self-contained (own dependencies, Dockerfile, config) so it can be
extracted into its own git repository later with no code changes. See `/MIGRATION.md`
at the repo root for the extraction steps.

## Endpoints

| Method | Path                     | Description                                  |
|--------|--------------------------|------------------------------------------------|
| GET    | `/health`                | Liveness check                                 |
| GET    | `/services`              | List managed services and their running status |
| POST   | `/services/{name}/enable`  | Start a managed service's container          |
| POST   | `/services/{name}/disable` | Stop a managed service's container           |
| POST   | `/services/{name}/restart` | Restart a managed service's container        |
| POST   | `/agent/chat`            | Natural-language agent chat over the above     |

`name` is one of `audio-service`, `calendar-service`, `image-service` (or whatever is
configured in `MANAGED_SERVICES_JSON`).

All endpoints except `/health` require header `X-API-Key` if `API_KEY` is set. **Always set
`API_KEY` outside of local dev** - this service can stop and start containers.

## How container control works

`app/docker_manager.py` talks to the Docker Engine API via the `docker` Python SDK, which
requires `/var/run/docker.sock` to be mounted into this container (see `docker-compose.yml`).

> **Security note:** mounting the Docker socket gives this container root-equivalent control
> over the whole host. Only deploy this on a trusted host, keep `API_KEY` set, and in
> production prefer a read-only [docker socket proxy](https://github.com/Tecnativa/docker-socket-proxy)
> that only allows the start/stop/restart operations this service actually needs, rather than
> mounting the raw socket.

## Configuration

Copy `.env.example` to `.env` and adjust. `ANTHROPIC_API_KEY` enables `/agent/chat`; without
it the endpoint returns a message saying the key is missing instead of erroring.

## Run locally

```bash
pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --reload
```

## Run with Docker

```bash
docker compose up --build
```

## Tests

Tests stub out the Docker Engine API (`tests/conftest.py`) so they run without a docker
daemon:

```bash
pip install -r requirements-dev.txt
pytest
```
