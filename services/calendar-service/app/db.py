"""Repository abstraction so the service can run against local sqlite (zero-config dev),
Render/managed Postgres, or Azure Cosmos DB by flipping DB_BACKEND in the environment.
"""
from __future__ import annotations

import json
import sqlite3
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any

from .config import Settings


class EventRepository(ABC):
    @abstractmethod
    def create(self, data: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    def get(self, item_id: str) -> dict[str, Any] | None: ...

    @abstractmethod
    def list(self, limit: int, offset: int, start: str | None, end: str | None) -> tuple[list[dict[str, Any]], int]: ...

    @abstractmethod
    def cancel(self, item_id: str) -> bool: ...

    @abstractmethod
    def delete(self, item_id: str) -> bool: ...

    @abstractmethod
    def find_conflicts(self, resource: str, start: str, end: str) -> list[dict[str, Any]]: ...


def _new_record(data: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "title": data["title"],
        "description": data.get("description", ""),
        "start_time": data["start_time"],
        "end_time": data["end_time"],
        "kind": data.get("kind", "event"),
        "resource": data.get("resource", ""),
        "attendees": data.get("attendees", []),
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def _overlaps(a_start: str, a_end: str, b_start: str, b_end: str) -> bool:
    return a_start < b_end and b_start < a_end


class SqliteEventRepository(EventRepository):
    def __init__(self, settings: Settings):
        self._conn = sqlite3.connect(settings.sqlite_path, check_same_thread=False)
        self._conn.execute(
            """CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                start_time TEXT NOT NULL,
                end_time TEXT NOT NULL,
                kind TEXT NOT NULL,
                resource TEXT NOT NULL,
                attendees TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL
            )"""
        )
        self._conn.commit()

    def create(self, data):
        record = _new_record(data)
        self._conn.execute(
            "INSERT INTO events (id, title, description, start_time, end_time, kind, resource, attendees, status, created_at)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                record["id"], record["title"], record["description"], record["start_time"], record["end_time"],
                record["kind"], record["resource"], json.dumps(record["attendees"]), record["status"], record["created_at"],
            ),
        )
        self._conn.commit()
        return record

    def get(self, item_id):
        row = self._conn.execute("SELECT * FROM events WHERE id = ?", (item_id,)).fetchone()
        return self._row_to_record(row) if row else None

    def list(self, limit, offset, start=None, end=None):
        query = "SELECT * FROM events WHERE status != 'deleted'"
        params: list[Any] = []
        if start:
            query += " AND end_time >= ?"
            params.append(start)
        if end:
            query += " AND start_time <= ?"
            params.append(end)
        total = self._conn.execute(query.replace("SELECT *", "SELECT COUNT(*)"), params).fetchone()[0]
        query += " ORDER BY start_time ASC LIMIT ? OFFSET ?"
        params += [limit, offset]
        rows = self._conn.execute(query, params).fetchall()
        return [self._row_to_record(r) for r in rows], total

    def cancel(self, item_id):
        cur = self._conn.execute("UPDATE events SET status = 'cancelled' WHERE id = ?", (item_id,))
        self._conn.commit()
        return cur.rowcount > 0

    def delete(self, item_id):
        cur = self._conn.execute("DELETE FROM events WHERE id = ?", (item_id,))
        self._conn.commit()
        return cur.rowcount > 0

    def find_conflicts(self, resource, start, end):
        if not resource:
            return []
        rows = self._conn.execute(
            "SELECT * FROM events WHERE resource = ? AND status = 'confirmed'", (resource,)
        ).fetchall()
        records = [self._row_to_record(r) for r in rows]
        return [r for r in records if _overlaps(r["start_time"], r["end_time"], start, end)]

    @staticmethod
    def _row_to_record(row) -> dict[str, Any]:
        cols = ["id", "title", "description", "start_time", "end_time", "kind", "resource", "attendees", "status", "created_at"]
        record = dict(zip(cols, row))
        record["attendees"] = json.loads(record["attendees"])
        return record


class PostgresEventRepository(EventRepository):
    """Works against any Postgres-wire-compatible DB, including Render's managed Postgres."""

    def __init__(self, settings: Settings):
        from sqlalchemy import create_engine, text

        self._text = text
        self._engine = create_engine(settings.postgres_url, pool_pre_ping=True)
        with self._engine.begin() as conn:
            conn.execute(text(
                """CREATE TABLE IF NOT EXISTS events (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    start_time TIMESTAMPTZ NOT NULL,
                    end_time TIMESTAMPTZ NOT NULL,
                    kind TEXT NOT NULL,
                    resource TEXT NOT NULL,
                    attendees JSONB NOT NULL,
                    status TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL
                )"""
            ))

    def create(self, data):
        record = _new_record(data)
        with self._engine.begin() as conn:
            conn.execute(self._text(
                "INSERT INTO events (id, title, description, start_time, end_time, kind, resource, attendees, status, created_at)"
                " VALUES (:id, :title, :description, :start_time, :end_time, :kind, :resource, :attendees, :status, :created_at)"
            ), {**record, "attendees": json.dumps(record["attendees"])})
        return record

    def get(self, item_id):
        with self._engine.begin() as conn:
            row = conn.execute(self._text("SELECT * FROM events WHERE id = :id"), {"id": item_id}).mappings().fetchone()
        return self._normalize(row) if row else None

    def list(self, limit, offset, start=None, end=None):
        clauses = ["status != 'deleted'"]
        params: dict[str, Any] = {"limit": limit, "offset": offset}
        if start:
            clauses.append("end_time >= :start")
            params["start"] = start
        if end:
            clauses.append("start_time <= :end")
            params["end"] = end
        where = " AND ".join(clauses)
        with self._engine.begin() as conn:
            total = conn.execute(self._text(f"SELECT COUNT(*) FROM events WHERE {where}"), params).scalar_one()
            rows = conn.execute(self._text(
                f"SELECT * FROM events WHERE {where} ORDER BY start_time ASC LIMIT :limit OFFSET :offset"
            ), params).mappings().fetchall()
        return [self._normalize(r) for r in rows], total

    def cancel(self, item_id):
        with self._engine.begin() as conn:
            result = conn.execute(self._text("UPDATE events SET status = 'cancelled' WHERE id = :id"), {"id": item_id})
        return result.rowcount > 0

    def delete(self, item_id):
        with self._engine.begin() as conn:
            result = conn.execute(self._text("DELETE FROM events WHERE id = :id"), {"id": item_id})
        return result.rowcount > 0

    def find_conflicts(self, resource, start, end):
        if not resource:
            return []
        with self._engine.begin() as conn:
            rows = conn.execute(self._text(
                "SELECT * FROM events WHERE resource = :resource AND status = 'confirmed'"
                " AND start_time < :end AND end_time > :start"
            ), {"resource": resource, "start": start, "end": end}).mappings().fetchall()
        return [self._normalize(r) for r in rows]

    @staticmethod
    def _normalize(row) -> dict[str, Any]:
        record = dict(row)
        if isinstance(record["attendees"], str):
            record["attendees"] = json.loads(record["attendees"])
        record["start_time"] = str(record["start_time"])
        record["end_time"] = str(record["end_time"])
        record["created_at"] = str(record["created_at"])
        return record


class CosmosEventRepository(EventRepository):
    """Azure Cosmos DB (NoSQL API)."""

    def __init__(self, settings: Settings):
        from azure.cosmos import CosmosClient, PartitionKey

        client = CosmosClient(settings.cosmos_endpoint, credential=settings.cosmos_key)
        database = client.create_database_if_not_exists(id=settings.cosmos_database)
        self._container = database.create_container_if_not_exists(
            id=settings.cosmos_container, partition_key=PartitionKey(path="/id")
        )

    def create(self, data):
        record = _new_record(data)
        self._container.create_item(body=record)
        return record

    def get(self, item_id):
        try:
            return self._container.read_item(item=item_id, partition_key=item_id)
        except Exception:
            return None

    def list(self, limit, offset, start=None, end=None):
        query = "SELECT * FROM c WHERE c.status != 'deleted'"
        parameters = []
        if start:
            query += " AND c.end_time >= @start"
            parameters.append({"name": "@start", "value": start})
        if end:
            query += " AND c.start_time <= @end"
            parameters.append({"name": "@end", "value": end})
        query += " ORDER BY c.start_time ASC"
        items = list(self._container.query_items(
            query=query, parameters=parameters, enable_cross_partition_query=True
        ))
        total = len(items)
        return items[offset: offset + limit], total

    def cancel(self, item_id):
        record = self.get(item_id)
        if not record:
            return False
        record["status"] = "cancelled"
        self._container.upsert_item(body=record)
        return True

    def delete(self, item_id):
        try:
            self._container.delete_item(item=item_id, partition_key=item_id)
            return True
        except Exception:
            return False

    def find_conflicts(self, resource, start, end):
        if not resource:
            return []
        query = (
            "SELECT * FROM c WHERE c.resource = @resource AND c.status = 'confirmed'"
            " AND c.start_time < @end AND c.end_time > @start"
        )
        parameters = [
            {"name": "@resource", "value": resource},
            {"name": "@start", "value": start},
            {"name": "@end", "value": end},
        ]
        return list(self._container.query_items(
            query=query, parameters=parameters, enable_cross_partition_query=True
        ))


def build_repository(settings: Settings) -> EventRepository:
    if settings.db_backend == "postgres":
        return PostgresEventRepository(settings)
    if settings.db_backend == "cosmos":
        return CosmosEventRepository(settings)
    return SqliteEventRepository(settings)
