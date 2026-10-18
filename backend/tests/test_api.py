import os
import sqlite3
import tempfile

os.environ["DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")

import pytest
from fastapi.testclient import TestClient

import db
from main import app

QUESTION = {
    "title": "Design an LRU cache",
    "body": "Implement get and put in O(1) time.",
    "company": "Acme Corp",
    "category": "DSA",
    "difficulty": "Medium",
    "round": "Technical Interview",
    "role": "SDE 1",
    "asked_on": "2026-08",
    "tags": ["Hash Map", "linked list", "hash map"],
}


def client(username: str) -> TestClient:
    c = TestClient(app)
    c.__enter__()
    r = c.post("/api/auth/signup", json={"username": username, "password": "password123"})
    assert r.status_code == 200, r.text
    return c


@pytest.fixture(autouse=True)
def fresh_db():
    if os.path.exists(db.DB_PATH):
        os.remove(db.DB_PATH)
    db.init()


def test_strict_categories_rejected_by_api_and_database():
    alice = client("alice")
    assert alice.post("/api/questions", json={**QUESTION, "category": "Graphs"}).status_code == 422
    assert alice.post("/api/questions", json={**QUESTION, "category": "dsa"}).status_code == 422
    assert alice.get("/api/questions", params={"category": "Graphs"}).status_code == 400
    with pytest.raises(sqlite3.IntegrityError), db.transaction() as conn:
        conn.execute(
            "INSERT INTO questions (title, body, company_id, category, difficulty, round, author_id) "
            "VALUES ('t', 'b', 1, 'Graphs', 'Easy', 'HR', 1)"
        )


def test_post_question_starts_with_authors_vote_and_normalizes():
    alice = client("alice")
    q = alice.post("/api/questions", json={**QUESTION, "company": "  acme   corp "}).json()
    assert q["asked_count"] == 1 and q["asked_by_me"] and q["mine"]
    assert q["tags"] == ["hash map", "linked list"]
    # Same company regardless of spacing/case.
    alice.post("/api/questions", json={**QUESTION, "company": "ACME CORP", "title": "Another question"})
    assert [c["name"] for c in alice.get("/api/companies").json()] == ["acme corp"]


def test_thumbs_up_toggles_once_per_user():
    alice, bob = client("alice"), client("bob")
    qid = alice.post("/api/questions", json=QUESTION).json()["id"]
    assert bob.post(f"/api/questions/{qid}/asked").json() == {"asked_count": 2, "asked_by_me": True}
    assert bob.post(f"/api/questions/{qid}/asked").json() == {"asked_count": 1, "asked_by_me": False}
    assert TestClient(app).post(f"/api/questions/{qid}/asked").status_code == 401


def test_filters_sort_and_category_counts():
    alice, bob = client("alice"), client("bob")
    a = alice.post("/api/questions", json=QUESTION).json()["id"]
    b = alice.post("/api/questions", json={**QUESTION, "title": "Design a parking lot", "category": "LLD"}).json()["id"]
    c = alice.post("/api/questions", json={**QUESTION, "title": "Design Twitter feed", "category": "HLD", "company": "Globex"}).json()["id"]
    bob.post(f"/api/questions/{c}/asked")

    data = bob.get("/api/questions").json()
    assert data["items"][0]["id"] == c  # most asked first
    assert data["category_counts"] == {"DSA": 1, "LLD": 1, "HLD": 1}

    ids = lambda **p: [i["id"] for i in bob.get("/api/questions", params=p).json()["items"]]
    assert ids(category=["LLD", "HLD"], sort="newest") == [c, b]
    assert ids(company="Globex") == [c]
    assert ids(min_asked=2) == [c]
    assert ids(asked_by_me=True) == [c]
    assert ids(q="parking") == [b]
    assert set(ids(difficulty="Medium")) == {a, b, c}

    # Counts ignore the category filter but respect the others.
    counts = bob.get("/api/questions", params={"category": "DSA", "company": "Acme Corp"}).json()["category_counts"]
    assert counts == {"DSA": 1, "LLD": 1}


def test_only_author_can_delete():
    alice, bob = client("alice"), client("bob")
    qid = alice.post("/api/questions", json=QUESTION).json()["id"]
    assert bob.delete(f"/api/questions/{qid}").status_code == 403
    assert alice.delete(f"/api/questions/{qid}").status_code == 204
    assert alice.get(f"/api/questions/{qid}").status_code == 404


def test_jobs_post_filter_and_hide_closed():
    alice = client("alice")
    job = {
        "title": "Software Engineer Intern",
        "company": "Acme Corp",
        "location": "Bangalore",
        "job_type": "Internship",
        "work_mode": "Hybrid",
        "experience": "Student / Intern",
        "apply_url": "https://example.com/apply",
        "deadline": "2099-01-01",
    }
    assert alice.post("/api/jobs", json={**job, "apply_url": "javascript:alert(1)"}).status_code == 422
    assert alice.post("/api/jobs", json={**job, "job_type": "Gig"}).status_code == 422
    open_id = alice.post("/api/jobs", json=job).json()["id"]
    closed_id = alice.post("/api/jobs", json={**job, "title": "Old role", "deadline": "2000-01-01"}).json()["id"]

    ids = lambda **p: [j["id"] for j in alice.get("/api/jobs", params=p).json()["items"]]
    assert ids() == [open_id]
    assert ids(include_closed=True) == [closed_id, open_id]
    assert ids(job_type="Full-time") == []
    assert ids(q="bangalore") == [open_id]
    companies = alice.get("/api/companies").json()
    assert companies == [{"name": "Acme Corp", "question_count": 0, "job_count": 2}]


def test_auth_flow():
    c = TestClient(app)
    assert c.get("/api/auth/me").json() is None
    assert c.post("/api/questions", json=QUESTION).status_code == 401
    c.post("/api/auth/signup", json={"username": "carol", "password": "password123"})
    assert c.post("/api/auth/signup", json={"username": "CAROL", "password": "password123"}).status_code == 409
    assert c.get("/api/auth/me").json()["username"] == "carol"
    c.post("/api/auth/logout")
    assert c.get("/api/auth/me").json() is None
    assert c.post("/api/auth/login", json={"username": "carol", "password": "wrongpass1"}).status_code == 401
    assert c.post("/api/auth/login", json={"username": "carol", "password": "password123"}).status_code == 200


def test_jobs_scroll_with_cursor_never_repeats_when_new_jobs_arrive():
    import main

    alice = client("alice")
    job = {"title": "Job", "company": "Acme", "job_type": "Full-time", "work_mode": "Remote", "experience": "New Grad", "apply_url": "https://example.com"}
    for i in range(main.PAGE_SIZE + 5):
        alice.post("/api/jobs", json={**job, "title": f"Job {i}"})

    first = alice.get("/api/jobs").json()
    assert len(first["items"]) == main.PAGE_SIZE and first["total"] == main.PAGE_SIZE + 5
    assert first["items"][0]["title"] == f"Job {main.PAGE_SIZE + 4}"  # newest first

    alice.post("/api/jobs", json={**job, "title": "Posted while scrolling"})
    second = alice.get("/api/jobs", params={"before": first["next_before"]}).json()
    seen = [j["id"] for j in first["items"] + second["items"]]
    assert len(second["items"]) == 5 and len(seen) == len(set(seen))
    assert second["next_before"] is None
