"""Interview Hub API: past interview questions and job posts, by company."""

import os
import re
import sqlite3
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Literal

from fastapi import Cookie, Depends, FastAPI, HTTPException, Query, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

import auth
import db
from taxonomy import (
    CATEGORY_DESCRIPTIONS,
    DIFFICULTIES,
    EXPERIENCE_LEVELS,
    JOB_TYPES,
    QUESTION_CATEGORIES,
    ROUNDS,
    WORK_MODES,
)

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
PAGE_SIZE = 20
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"


@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init()
    yield


app = FastAPI(title="Interview Hub", lifespan=lifespan)

User = Annotated[dict, Depends(auth.require_user)]
MaybeUser = Annotated[dict | None, Depends(auth.optional_user)]


# -- options ------------------------------------------------------------------------


@app.get("/api/meta")
def meta():
    return {
        "categories": [{"name": c, "description": CATEGORY_DESCRIPTIONS[c]} for c in QUESTION_CATEGORIES],
        "difficulties": DIFFICULTIES,
        "rounds": ROUNDS,
        "job_types": JOB_TYPES,
        "work_modes": WORK_MODES,
        "experience_levels": EXPERIENCE_LEVELS,
    }


# -- accounts -----------------------------------------------------------------------


class Credentials(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=8, max_length=200)


def _sign_in(response: Response, user_id: int) -> None:
    response.set_cookie(
        auth.COOKIE,
        auth.new_session(user_id),
        httponly=True,
        samesite="lax",
        secure=COOKIE_SECURE,
        max_age=60 * 60 * 24 * 30,
    )


@app.post("/api/auth/signup")
def signup(body: Credentials, response: Response):
    try:
        with db.transaction() as conn:
            user_id = conn.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (body.username, auth.hash_password(body.password)),
            ).lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(409, "That username is taken.")
    _sign_in(response, user_id)
    return {"id": user_id, "username": body.username}


@app.post("/api/auth/login")
def login(body: Credentials, response: Response):
    with db.transaction() as conn:
        row = conn.execute("SELECT id, username, password_hash FROM users WHERE username = ?", (body.username,)).fetchone()
    if not row or not auth.check_password(body.password, row["password_hash"]):
        raise HTTPException(401, "Wrong username or password.")
    _sign_in(response, row["id"])
    return {"id": row["id"], "username": row["username"]}


@app.post("/api/auth/logout")
def logout(response: Response, session: str | None = Cookie(default=None)):
    if session:
        auth.end_session(session)
    response.delete_cookie(auth.COOKIE)
    return {"ok": True}


@app.get("/api/auth/me")
def me(user: MaybeUser):
    return user


# -- companies ----------------------------------------------------------------------

CompanyName = Annotated[str, Field(min_length=1, max_length=80)]


def clean_company(name: str) -> str:
    name = re.sub(r"\s+", " ", name).strip()
    if not name:
        raise ValueError("Company is required")
    return name


@app.get("/api/companies")
def companies(q: str = ""):
    with db.transaction() as conn:
        rows = conn.execute(
            """
            SELECT c.name,
                   (SELECT COUNT(*) FROM questions WHERE company_id = c.id) AS question_count,
                   (SELECT COUNT(*) FROM jobs WHERE company_id = c.id) AS job_count
            FROM companies c
            WHERE c.name LIKE ?
            ORDER BY question_count + job_count DESC, c.name
            LIMIT 200
            """,
            (f"%{q.strip()}%",),
        ).fetchall()
    return [dict(r) for r in rows if r["question_count"] or r["job_count"]]


# -- questions ----------------------------------------------------------------------


class QuestionIn(BaseModel):
    title: str = Field(min_length=5, max_length=200)
    body: str = Field(min_length=10, max_length=10_000)
    company: CompanyName
    category: Literal[QUESTION_CATEGORIES]  # type: ignore[valid-type]
    difficulty: Literal[DIFFICULTIES]  # type: ignore[valid-type]
    round: Literal[ROUNDS]  # type: ignore[valid-type]
    role: str = Field(default="", max_length=80)
    asked_on: str = Field(default="", pattern=r"^(\d{4}-(0[1-9]|1[0-2]))?$")
    tags: list[Annotated[str, Field(min_length=1, max_length=30)]] = Field(default_factory=list, max_length=8)

    @field_validator("company")
    @classmethod
    def company_name(cls, v: str) -> str:
        return clean_company(v)

    @field_validator("title", "body", "role")
    @classmethod
    def strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, tags: list[str]) -> list[str]:
        seen: list[str] = []
        for t in tags:
            t = re.sub(r"[\s,]+", " ", t).strip().lower()
            if t and t not in seen:
                seen.append(t)
        return seen


QUESTION_SELECT = """
    SELECT q.id, q.title, q.body, q.category, q.difficulty, q.round, q.role, q.asked_on, q.tags,
           q.created_at, c.name AS company, u.username AS author, q.author_id,
           (SELECT COUNT(*) FROM question_votes v WHERE v.question_id = q.id) AS asked_count,
           EXISTS (SELECT 1 FROM question_votes v WHERE v.question_id = q.id AND v.user_id = :me) AS asked_by_me
    FROM questions q
    JOIN companies c ON c.id = q.company_id
    JOIN users u ON u.id = q.author_id
"""


def question_json(row: sqlite3.Row, user: dict | None) -> dict:
    d = dict(row)
    d["tags"] = [t for t in d["tags"].split(",") if t]
    d["asked_by_me"] = bool(d["asked_by_me"])
    author_id = d.pop("author_id")
    d["mine"] = user is not None and author_id == user["id"]
    return d


def question_filters(
    category: list[str],
    company: str,
    difficulty: list[str],
    round: list[str],
    q: str,
    mine: bool,
    asked_by_me: bool,
    user: dict | None,
) -> tuple[list[str], dict]:
    where: list[str] = []
    params: dict = {"me": user["id"] if user else -1}
    for name, values in (("category", category), ("difficulty", difficulty), ("round", round)):
        if values:
            keys = [f"{name}{i}" for i in range(len(values))]
            where.append(f"q.{name} IN ({', '.join(':' + k for k in keys)})")
            params.update(zip(keys, values))
    if company:
        where.append("c.name = :company")
        params["company"] = company.strip()
    if q.strip():
        where.append("(q.title LIKE :q OR q.body LIKE :q OR q.tags LIKE :q OR c.name LIKE :q)")
        params["q"] = f"%{q.strip()}%"
    if mine:
        where.append("q.author_id = :me")
    if asked_by_me:
        where.append("EXISTS (SELECT 1 FROM question_votes v WHERE v.question_id = q.id AND v.user_id = :me)")
    return where, params


@app.get("/api/questions")
def list_questions(
    user: MaybeUser,
    category: Annotated[list[str], Query()] = [],
    company: str = "",
    difficulty: Annotated[list[str], Query()] = [],
    round: Annotated[list[str], Query()] = [],
    q: str = "",
    min_asked: int = Query(0, ge=0),
    mine: bool = False,
    asked_by_me: bool = False,
    sort: Literal["most_asked", "newest"] = "most_asked",
    page: int = Query(1, ge=1),
):
    bad = [c for c in category if c not in QUESTION_CATEGORIES]
    if bad:
        raise HTTPException(400, f"Unknown category: {', '.join(bad)}")

    where, params = question_filters(category, company, difficulty, round, q, mine, asked_by_me, user)
    base = QUESTION_SELECT + (" WHERE " + " AND ".join(where) if where else "")
    filtered = f"SELECT * FROM ({base}) WHERE asked_count >= :min_asked"
    params["min_asked"] = min_asked
    order = "asked_count DESC, created_at DESC" if sort == "most_asked" else "created_at DESC"

    # Category counts for the sidebar ignore the category filter itself, so you
    # can see how many questions each category would show.
    facet_where, facet_params = question_filters([], company, difficulty, round, q, mine, asked_by_me, user)
    facet_base = QUESTION_SELECT + (" WHERE " + " AND ".join(facet_where) if facet_where else "")
    facet_params["min_asked"] = min_asked

    with db.transaction() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM ({filtered})", params).fetchone()[0]
        rows = conn.execute(
            f"{filtered} ORDER BY {order} LIMIT :limit OFFSET :offset",
            {**params, "limit": PAGE_SIZE, "offset": (page - 1) * PAGE_SIZE},
        ).fetchall()
        counts = conn.execute(
            f"SELECT category, COUNT(*) AS n FROM ({facet_base}) WHERE asked_count >= :min_asked GROUP BY category",
            facet_params,
        ).fetchall()

    return {
        "items": [question_json(r, user) for r in rows],
        "total": total,
        "page": page,
        "page_size": PAGE_SIZE,
        "category_counts": {r["category"]: r["n"] for r in counts},
    }


def _get_question(conn: sqlite3.Connection, question_id: int, user: dict | None) -> sqlite3.Row:
    row = conn.execute(
        QUESTION_SELECT + " WHERE q.id = :id", {"id": question_id, "me": user["id"] if user else -1}
    ).fetchone()
    if not row:
        raise HTTPException(404, "Question not found.")
    return row


@app.get("/api/questions/{question_id}")
def get_question(question_id: int, user: MaybeUser):
    with db.transaction() as conn:
        return question_json(_get_question(conn, question_id, user), user)


@app.post("/api/questions", status_code=201)
def create_question(body: QuestionIn, user: User):
    with db.transaction() as conn:
        question_id = conn.execute(
            """
            INSERT INTO questions (title, body, company_id, category, difficulty, round, role, asked_on, tags, author_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                body.title,
                body.body,
                db.company_id(conn, body.company),
                body.category,
                body.difficulty,
                body.round,
                body.role,
                body.asked_on,
                ",".join(body.tags),
                user["id"],
            ),
        ).lastrowid
        # The person posting it was asked it, so it starts with their thumbs-up.
        conn.execute("INSERT INTO question_votes (question_id, user_id) VALUES (?, ?)", (question_id, user["id"]))
        return question_json(_get_question(conn, question_id, user), user)


@app.post("/api/questions/{question_id}/asked")
def toggle_asked(question_id: int, user: User):
    """Thumbs-up "I was asked this too". Calling it again removes the vote."""
    with db.transaction() as conn:
        _get_question(conn, question_id, user)
        removed = conn.execute(
            "DELETE FROM question_votes WHERE question_id = ? AND user_id = ?", (question_id, user["id"])
        ).rowcount
        if not removed:
            conn.execute("INSERT INTO question_votes (question_id, user_id) VALUES (?, ?)", (question_id, user["id"]))
        row = _get_question(conn, question_id, user)
    return {"asked_count": row["asked_count"], "asked_by_me": bool(row["asked_by_me"])}


@app.delete("/api/questions/{question_id}", status_code=204)
def delete_question(question_id: int, user: User):
    with db.transaction() as conn:
        row = conn.execute("SELECT author_id FROM questions WHERE id = ?", (question_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Question not found.")
        if row["author_id"] != user["id"]:
            raise HTTPException(403, "You can only delete your own posts.")
        conn.execute("DELETE FROM questions WHERE id = ?", (question_id,))


# -- jobs -----------------------------------------------------------------------------


class JobIn(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    company: CompanyName
    location: str = Field(default="", max_length=120)
    job_type: Literal[JOB_TYPES]  # type: ignore[valid-type]
    work_mode: Literal[WORK_MODES]  # type: ignore[valid-type]
    experience: Literal[EXPERIENCE_LEVELS]  # type: ignore[valid-type]
    apply_url: str = Field(max_length=500, pattern=r"^https?://\S+$")
    description: str = Field(default="", max_length=10_000)
    deadline: str = Field(default="", pattern=r"^(\d{4}-\d{2}-\d{2})?$")

    @field_validator("company")
    @classmethod
    def company_name(cls, v: str) -> str:
        return clean_company(v)

    @field_validator("title", "location", "description", "apply_url")
    @classmethod
    def strip(cls, v: str) -> str:
        return v.strip()


JOB_SELECT = """
    SELECT j.id, j.title, j.location, j.job_type, j.work_mode, j.experience, j.apply_url,
           j.description, j.deadline, j.created_at, c.name AS company, u.username AS author,
           j.author_id = :me AS mine
    FROM jobs j
    JOIN companies c ON c.id = j.company_id
    JOIN users u ON u.id = j.author_id
"""


def job_json(row: sqlite3.Row) -> dict:
    d = dict(row)
    d["mine"] = bool(d["mine"])
    return d


@app.get("/api/jobs")
def list_jobs(
    user: MaybeUser,
    company: str = "",
    job_type: Annotated[list[str], Query()] = [],
    work_mode: Annotated[list[str], Query()] = [],
    experience: Annotated[list[str], Query()] = [],
    q: str = "",
    include_closed: bool = False,
    before: int | None = Query(None, ge=1, description="Cursor: only jobs older than this id"),
):
    """Newest first. Pass `next_before` from a response as `before` to load the
    next batch; unlike page numbers, this never repeats or skips a job when new
    ones are posted while someone is scrolling."""
    where: list[str] = []
    params: dict = {"me": user["id"] if user else -1}
    for name, values in (("job_type", job_type), ("work_mode", work_mode), ("experience", experience)):
        if values:
            keys = [f"{name}{i}" for i in range(len(values))]
            where.append(f"j.{name} IN ({', '.join(':' + k for k in keys)})")
            params.update(zip(keys, values))
    if company:
        where.append("c.name = :company")
        params["company"] = company.strip()
    if q.strip():
        where.append("(j.title LIKE :q OR j.location LIKE :q OR j.description LIKE :q OR c.name LIKE :q)")
        params["q"] = f"%{q.strip()}%"
    if not include_closed:
        where.append("(j.deadline = '' OR j.deadline >= date('now'))")
    base = JOB_SELECT + (" WHERE " + " AND ".join(where) if where else "")
    batch = JOB_SELECT + " WHERE " + " AND ".join([*where, "j.id < :before"])

    with db.transaction() as conn:
        total = conn.execute(f"SELECT COUNT(*) FROM ({base})", params).fetchone()[0]
        # Ids only grow, so "newest first" is "highest id first". One extra row
        # tells us whether another batch exists.
        rows = conn.execute(
            f"{batch} ORDER BY j.id DESC LIMIT :limit",
            {**params, "before": before or 2**62, "limit": PAGE_SIZE + 1},
        ).fetchall()
    items = [job_json(r) for r in rows[:PAGE_SIZE]]
    next_before = items[-1]["id"] if len(rows) > PAGE_SIZE else None
    return {"items": items, "total": total, "next_before": next_before}


@app.get("/api/jobs/{job_id}")
def get_job(job_id: int, user: MaybeUser):
    with db.transaction() as conn:
        row = conn.execute(JOB_SELECT + " WHERE j.id = :id", {"id": job_id, "me": user["id"] if user else -1}).fetchone()
    if not row:
        raise HTTPException(404, "Job not found.")
    return job_json(row)


@app.post("/api/jobs", status_code=201)
def create_job(body: JobIn, user: User):
    with db.transaction() as conn:
        job_id = conn.execute(
            """
            INSERT INTO jobs (title, company_id, location, job_type, work_mode, experience, apply_url, description, deadline, author_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                body.title,
                db.company_id(conn, body.company),
                body.location,
                body.job_type,
                body.work_mode,
                body.experience,
                body.apply_url,
                body.description,
                body.deadline,
                user["id"],
            ),
        ).lastrowid
        row = conn.execute(JOB_SELECT + " WHERE j.id = :id", {"id": job_id, "me": user["id"]}).fetchone()
    return job_json(row)


@app.delete("/api/jobs/{job_id}", status_code=204)
def delete_job(job_id: int, user: User):
    with db.transaction() as conn:
        row = conn.execute("SELECT author_id FROM jobs WHERE id = ?", (job_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Job not found.")
        if row["author_id"] != user["id"]:
            raise HTTPException(403, "You can only delete your own posts.")
        conn.execute("DELETE FROM jobs WHERE id = ?", (job_id,))


# -- frontend (production build) ---------------------------------------------------------

if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}")
    def spa(path: str):
        file = (FRONTEND_DIST / path).resolve()
        if path and file.is_relative_to(FRONTEND_DIST) and file.is_file():
            return FileResponse(file)
        return FileResponse(FRONTEND_DIST / "index.html")
