#!/bin/bash
# Creates one database per microservice on the shared local Postgres instance used by the
# top-level docker-compose.yml. Not needed against a real Render Postgres instance (there
# you'd typically provision one database per service, or point services at separate
# Render Postgres instances).
set -euo pipefail

for db in audio_db calendar_db image_db; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    SELECT 'CREATE DATABASE $db' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$db')\gexec
EOSQL
done
