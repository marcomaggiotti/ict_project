# Splitting this monorepo into separate repos

Everything under `services/*`, `webapp/`, and `mobile-app/` was built as a self-contained
folder on purpose: no imports reach outside their own folder, and each has its own
dependency manifest, Dockerfile, `.env.example`, and README. That means each one can become
its own git repository later with **no code changes** - only the extraction step differs.

There are two common ways to do the extraction. Either works; `git subtree split` preserves
history for that folder, the plain-copy approach is simpler if history doesn't matter.

## Option A - preserve history with `git subtree split`

```bash
# Example for audio-service; repeat per folder.
git subtree split --prefix=services/audio-service -b split-audio-service

# Create an empty repo on GitHub first (e.g. ai-agent-audio-service), then:
git remote add audio-service-origin git@github.com:<you>/ai-agent-audio-service.git
git push audio-service-origin split-audio-service:main

# Clean up the local split branch once pushed.
git branch -D split-audio-service
git remote remove audio-service-origin
```

Repeat with `--prefix=services/calendar-service`, `--prefix=services/image-service`,
`--prefix=services/master-service`, `--prefix=webapp`, `--prefix=mobile-app`.

## Option B - plain copy (no history)

```bash
mkdir /tmp/ai-agent-audio-service
cp -r services/audio-service/. /tmp/ai-agent-audio-service/
cd /tmp/ai-agent-audio-service
git init && git add . && git commit -m "Initial import from ict_project monorepo"
git remote add origin git@github.com:<you>/ai-agent-audio-service.git
git push -u origin main
```

## After splitting

1. Delete the folder from this monorepo (or leave it and add it to `.gitignore` during a
   transition period, or keep both temporarily and rely on the split repo).
2. Update `docker-compose.yml` at the root to `build` from a pinned image published by the
   split repo's CI (e.g. `ghcr.io/<you>/ai-agent-audio-service:latest`) instead of a local
   `./services/audio-service` build context.
3. Update `services/master-service/app/registry.py` (or `MANAGED_SERVICES_JSON`) if
   container names change.
4. Set up CI (build + test + push image) in each new repo - none of the service folders
   currently ship a CI workflow, so add `.github/workflows/ci.yml` per repo as part of the
   split.

## Suggested target repo names

| Folder                        | Suggested repo name         |
|--------------------------------|------------------------------|
| `services/audio-service`      | `ai-agent-audio-service`     |
| `services/calendar-service`   | `ai-agent-calendar-service`  |
| `services/image-service`      | `ai-agent-image-service`     |
| `services/master-service`     | `ai-agent-master-service`    |
| `webapp`                      | `ai-agent-webapp`            |
| `mobile-app`                  | `ai-agent-mobile-app`        |
