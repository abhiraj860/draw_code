"""Fills an empty database with demo data so you can try the site locally.

Run:  .venv/bin/python seed.py

The companies are fictional on purpose, so the demo never presents made-up
interview questions as if a real company asked them. Do not run this on a
production database.
"""

from fastapi.testclient import TestClient

import db
from main import app

USERS = ["demo_asha", "demo_ravi", "demo_meera", "demo_john", "demo_li"]

QUESTIONS = [
    # (title, body, company, category, difficulty, round, role, asked_on, tags, extra thumbs-up)
    ("Two Sum with a stream of numbers", "Numbers arrive one at a time. Support add(x) and find(target) returning whether any pair sums to target. Follow-up: optimize for many finds vs many adds.", "Acme Corp", "DSA", "Medium", "Online Assessment", "SDE Intern", "2026-07", ["hash map", "design"], 4),
    ("Design a parking lot", "Classes for levels, spots of different sizes, tickets and payments. Interviewer asked how to add EV charging spots without changing existing classes.", "Acme Corp", "LLD", "Medium", "Technical Interview", "SDE 1", "2026-06", ["oop", "strategy pattern"], 2),
    ("Design a URL shortener", "Generate short codes, redirect at 50k QPS, custom aliases, expiry. Discussed hashing vs counters, caching, and analytics.", "Globex", "HLD", "Medium", "System Design Round", "SDE 2", "2026-05", ["caching", "sharding"], 3),
    ("Build a CLI todo app with an AI assistant", "90 minutes, AI assistant allowed. Graded on tests, code structure and how you reviewed the AI's output, not just whether it worked.", "Initech", "AI Coding", "Easy", "Technical Interview", "New Grad", "2026-08", ["testing", "code review"], 1),
    ("Top K frequent words in a log file", "File does not fit in memory. Return the K most frequent words. Follow-up: make it work across 10 machines.", "Globex", "DSA", "Hard", "Technical Interview", "SDE 2", "2026-04", ["heap", "external sort"], 0),
    ("Second highest salary per department", "Write SQL returning the second highest distinct salary in each department, handling ties and departments with one employee.", "Hooli", "SQL", "Medium", "Online Assessment", "Data Analyst", "2026-03", ["window functions"], 2),
    ("Tell me about a time you disagreed with a teammate", "Expected STAR format. Follow-ups on what you would do differently and how the relationship ended up.", "Initech", "Behavioral", "Easy", "Hiring Manager", "SDE Intern", "2026-07", ["star"], 0),
    ("Design a rate limiter", "Per-user limits for an API gateway. Compared token bucket and sliding window; asked about distributed counters in Redis.", "Hooli", "HLD", "Hard", "System Design Round", "SDE 2", "2026-08", ["rate limiting", "redis"], 3),
    ("What happens when you type a URL in the browser?", "Went deep on DNS, TCP handshake, TLS, HTTP/2 and browser rendering.", "Acme Corp", "CS Fundamentals", "Easy", "Phone Screen", "New Grad", "2026-02", ["networking"], 1),
]

JOBS = [
    ("Software Engineer Intern (Summer 2027)", "Acme Corp", "Bangalore, India", "Internship", "Hybrid", "Student / Intern", "2027-01-31", "12-week internship on the payments team. Eligibility: final-year students."),
    ("Backend Engineer, New Grad", "Globex", "Remote (India)", "Full-time", "Remote", "New Grad", "", "Build APIs in Go and Python. Strong DSA and one internship preferred."),
    ("ML Engineer", "Hooli", "Hyderabad, India", "Full-time", "On-site", "2-5 years", "2026-12-15", "Ranking and recommendations. Experience shipping models to production."),
]


def main() -> None:
    db.init()
    with db.transaction() as conn:
        if conn.execute("SELECT COUNT(*) FROM questions").fetchone()[0]:
            print("Database already has questions; not seeding.")
            return

    clients = []
    for name in USERS:
        c = TestClient(app)
        c.post("/api/auth/signup", json={"username": name, "password": "demo-password"})
        clients.append(c)

    for i, (title, body, company, category, difficulty, rnd, role, asked_on, tags, extra) in enumerate(QUESTIONS):
        author = clients[i % len(clients)]
        q = author.post(
            "/api/questions",
            json={"title": title, "body": body, "company": company, "category": category, "difficulty": difficulty, "round": rnd, "role": role, "asked_on": asked_on, "tags": tags},
        ).json()
        voters = [c for c in clients if c is not author][:extra]
        for v in voters:
            v.post(f"/api/questions/{q['id']}/asked")

    for i, (title, company, location, job_type, mode, exp, deadline, desc) in enumerate(JOBS):
        clients[i].post(
            "/api/jobs",
            json={"title": title, "company": company, "location": location, "job_type": job_type, "work_mode": mode, "experience": exp, "apply_url": "https://example.com/careers", "description": desc, "deadline": deadline},
        )

    print(f"Seeded {len(QUESTIONS)} questions and {len(JOBS)} jobs. Demo users: {', '.join(USERS)} (password: demo-password)")


if __name__ == "__main__":
    main()
