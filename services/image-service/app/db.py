"""Repository abstraction so the service can run against local sqlite (zero-config dev),
Render/managed Postgres, or Azure Cosmos DB by flipping DB_BACKEND in the environment.
"""
from __future__ import annotations

import base64
import json
import sqlite3
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any

from .config import Settings


class ImageRepository(ABC):
    @abstractmethod
    def create(self, filename: str, content_type: str, data: bytes, tags: list[str]) -> dict[str, Any]: ...

    @abstractmethod
    def get(self, item_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    def list(self, limit: int, offset: int) -> tuple[list[dict[str, Any]], int]: ...

    @abstractmethod
    def delete(self, item_id: str) -> bool: ...


def _new_record(filename: str, content_type: str, data: bytes, tags: list[str]) -> dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "filename": filename,
        "content_type": content_type,
        "size_bytes": len(data),
        "data_base64": base64.b64encode(data).decode("ascii"),
        "tags": tags,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def _without_payload(record: dict[str, Any]) -> dict[str, Any]:
    return {k: v for k, v in record.items() if k != "data_base64"}


class SqliteImageRepository(ImageRepository):
    """Zero-config default so the service runs out of the box without any managed DB."""

    def __init__(self, settings: Settings):
        self._conn = sqlite3.connect(settings.sqlite_path, check_same_thread=False)
        self._conn.execute(
            """CREATE TABLE IF NOT EXISTS image_files (
                id TEXT PRIMARY KEY,
                filename TEXT NOT NULL,
                content_type TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                data_base64 TEXT NOT NULL,
                tags TEXT NOT NULL,
                created_at TEXT NOT NULL
            )"""
        )
        self._conn.commit()

    def create(self, filename, content_type, data, tags):
        record = _new_record(filename, content_type, data, tags)
        self._conn.execute(
            "INSERT INTO image_files (id, filename, content_type, size_bytes, data_base64, tags, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                record["id"], record["filename"], record["content_type"], record["size_bytes"],
                record["data_base64"], json.dumps(record["tags"]), record["created_at"],
            ),
        )
        self._conn.commit()
        return record

    def get(self, item_id):
        row = self._conn.execute(
            "SELECT id, filename, content_type, size_bytes, data_base64, tags, created_at"
            " FROM image_files WHERE id = ?", (item_id,),
        ).fetchone()
        if not row:
            return None
        return self._row_to_record(row)

    def list(self, limit, offset):
        total = self._conn.execute("SELECT COUNT(*) FROM image_files").fetchone()[0]
        rows = self._conn.execute(
            "SELECT id, filename, content_type, size_bytes, data_base64, tags, created_at"
            " FROM image_files ORDER BY created_at DESC LIMIT ? OFFSET ?", (limit, offset),
        ).fetchall()
        return [self._row_to_record(r) for r in rows], total

    def delete(self, item_id):
        cur = self._conn.execute("DELETE FROM image_files WHERE id = ?", (item_id,))
        self._conn.commit()
        return cur.rowcount > 0

    @staticmethod
    def _row_to_record(row) -> dict[str, Any]:
        return {
            "id": row[0], "filename": row[1], "content_type": row[2], "size_bytes": row[3],
            "data_base64": row[4], "tags": json.loads(row[5]), "created_at": row[6],
        }


class PostgresImageRepository(ImageRepository):
    """Works against any Postgres-wire-compatible DB, including Render's managed Postgres."""

    def __init__(self, settings: Settings):
        from sqlalchemy import create_engine, text

        self._text = text
        self._engine = create_engine(settings.postgres_url, pool_pre_ping=True)
        with self._engine.begin() as conn:
            conn.execute(text(
                """CREATE TABLE IF NOT EXISTS image_files (
                    id TEXT PRIMARY KEY,
                    filename TEXT NOT NULL,
                    content_type TEXT NOT NULL,
                    size_bytes INTEGER NOT NULL,
                    data_base64 TEXT NOT NULL,
                    tags JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL
                )"""
            ))

    def create(self, filename, content_type, data, tags):
        record = _new_record(filename, content_type, data, tags)
        with self._engine.begin() as conn:
            conn.execute(self._text(
                "INSERT INTO image_files (id, filename, content_type, size_bytes, data_base64, tags, created_at)"
                " VALUES (:id, :filename, :content_type, :size_bytes, :data_base64, :tags, :created_at)"
            ), {**record, "tags": json.dumps(record["tags"])})
        return record

    def get(self, item_id):
        with self._engine.begin() as conn:
            row = conn.execute(self._text(
                "SELECT id, filename, content_type, size_bytes, data_base64, tags, created_at"
                " FROM image_files WHERE id = :id"
            ), {"id": item_id}).mappings().fetchone()
        if not row:
            return None
        return {**dict(row), "tags": row["tags"] if isinstance(row["tags"], list) else json.loads(row["tags"])}

    def list(self, limit, offset):
        with self._engine.begin() as conn:
            total = conn.execute(self._text("SELECT COUNT(*) FROM image_files")).scalar_one()
            rows = conn.execute(self._text(
                "SELECT id, filename, content_type, size_bytes, data_base64, tags, created_at"
                " FROM image_files ORDER BY created_at DESC LIMIT :limit OFFSET :offset"
            ), {"limit": limit, "offset": offset}).mappings().fetchall()
        items = [{**dict(r), "tags": r["tags"] if isinstance(r["tags"], list) else json.loads(r["tags"])} for r in rows]
        return items, total

    def delete(self, item_id):
        with self._engine.begin() as conn:
            result = conn.execute(self._text("DELETE FROM image_files WHERE id = :id"), {"id": item_id})
        return result.rowcount > 0


class CosmosImageRepository(ImageRepository):
    """Azure Cosmos DB (NoSQL API). Note: Cosmos documents are capped at 2MB, which bounds
    the image file size storable this way - fine for a scaffold, use blob storage for production.
    """

    def __init__(self, settings: Settings):
        from azure.cosmos import CosmosClient, PartitionKey

        client = CosmosClient(settings.cosmos_endpoint, credential=settings.cosmos_key)
        database = client.create_database_if_not_exists(id=settings.cosmos_database)
        self._container = database.create_container_if_not_exists(
            id=settings.cosmos_container, partition_key=PartitionKey(path="/id")
        )

    def create(self, filename, content_type, data, tags):
        record = _new_record(filename, content_type, data, tags)
        self._container.create_item(body=record)
        return record

    def get(self, item_id):
        try:
            return self._container.read_item(item=item_id, partition_key=item_id)
        except Exception:
            return None

    def list(self, limit, offset):
        query = "SELECT * FROM c ORDER BY c.created_at DESC"
        items = list(self._container.query_items(query=query, enable_cross_partition_query=True))
        total = len(items)
        return items[offset: offset + limit], total

    def delete(self, item_id):
        try:
            self._container.delete_item(item=item_id, partition_key=item_id)
            return True
        except Exception:
            return False


def build_repository(settings: Settings) -> ImageRepository:
    if settings.db_backend == "postgres":
        return PostgresImageRepository(settings)
    if settings.db_backend == "cosmos":
        return CosmosImageRepository(settings)
    return SqliteImageRepository(settings)
