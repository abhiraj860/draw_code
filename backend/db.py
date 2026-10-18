"""SQLite storage. One file, created on first start."""

import os
import sqlite3
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from taxonomy import DIFFICULTIES, EXPERIENCE_LEVELS, JOB_TYPES, QUESTION_CATEGORIES, ROUNDS, WORK_MODES

DB_PATH = Path(os.getenv("DB_PATH", Path(__file__).resolve().parent / "data.db"))


def _one_of(column: str, values: tuple[str, ...]) -> str:
    quoted = ", ".join("'" + v.replace("'", "''") + "'" for v in values)
    return f"CHECK ({column} IN ({quoted}))"


def schema() -> str:
    return f"""
    CREATE TABLE IF NOT EXISTS users (
        id            INTEGER PRIMARY KEY,
        username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
        token      TEXT PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS companies (
        id   INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE COLLATE NOCASE
    );

    CREATE TABLE IF NOT EXISTS questions (
        id          INTEGER PRIMARY KEY,
        title       TEXT NOT NULL,
        body        TEXT NOT NULL,
        company_id  INTEGER NOT NULL REFERENCES companies(id),
        category    TEXT NOT NULL {_one_of("category", QUESTION_CATEGORIES)},
        difficulty  TEXT NOT NULL {_one_of("difficulty", DIFFICULTIES)},
        round       TEXT NOT NULL {_one_of("round", ROUNDS)},
        role        TEXT NOT NULL DEFAULT '',
        asked_on    TEXT NOT NULL DEFAULT '',  -- YYYY-MM
        tags        TEXT NOT NULL DEFAULT '',  -- comma separated topic tags
        author_id   INTEGER NOT NULL REFERENCES users(id),
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS question_votes (
        question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
        user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at  TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (question_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS jobs (
        id          INTEGER PRIMARY KEY,
        title       TEXT NOT NULL,
        company_id  INTEGER NOT NULL REFERENCES companies(id),
        location    TEXT NOT NULL DEFAULT '',
        job_type    TEXT NOT NULL {_one_of("job_type", JOB_TYPES)},
        work_mode   TEXT NOT NULL {_one_of("work_mode", WORK_MODES)},
        experience  TEXT NOT NULL {_one_of("experience", EXPERIENCE_LEVELS)},
        apply_url   TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        deadline    TEXT NOT NULL DEFAULT '',  -- YYYY-MM-DD
        author_id   INTEGER NOT NULL REFERENCES users(id),
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_questions_company ON questions(company_id);
    CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
    CREATE INDEX IF NOT EXISTS idx_jobs_company ON jobs(company_id);
    """


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def transaction() -> Iterator[sqlite3.Connection]:
    conn = connect()
    try:
        with conn:
            yield conn
    finally:
        conn.close()


def init() -> None:
    with transaction() as conn:
        conn.executescript(schema())


def company_id(conn: sqlite3.Connection, name: str) -> int:
    """Finds a company by name (case-insensitive) or creates it."""
    row = conn.execute("SELECT id FROM companies WHERE name = ?", (name,)).fetchone()
    if row:
        return row["id"]
    return conn.execute("INSERT INTO companies (name) VALUES (?)", (name,)).lastrowid
