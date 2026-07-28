#!/bin/sh
# Runs automatically on container start (nginx:alpine's docker-entrypoint.d convention).
# Renders public/config.template.js -> /usr/share/nginx/html/config.js with real env values,
# since a Docker image build is a fixed artifact and can't bake in per-environment service URLs.
set -eu

: "${AUDIO_URL:=http://localhost:8001}"
: "${CALENDAR_URL:=http://localhost:8003}"
: "${IMAGE_URL:=http://localhost:8002}"
: "${MASTER_URL:=http://localhost:8000}"

envsubst '${AUDIO_URL} ${CALENDAR_URL} ${IMAGE_URL} ${MASTER_URL}' \
  < /usr/share/nginx/html/config.template.js \
  > /usr/share/nginx/html/config.js
