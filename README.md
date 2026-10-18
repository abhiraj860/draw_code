# Interview Hub

A site where students share **past interview questions** by company and post **jobs**.

- **Questions:** company, a strict category (DSA, LLD, HLD, AI Coding, Machine Learning, SQL, CS Fundamentals, Frontend, Behavioral, Other), difficulty, round, role, when it was asked, and topic tags.
- **👍 "Asked to me too":** anyone signed in can confirm they were asked a question. One vote per person; clicking again removes it. The person who posts a question counts as the first vote.
- **Filters:** category (with live counts), how many people were asked it (2+, 5+, 10+), difficulty, round, company, full-text search, "questions I was asked" and "questions I posted". Sort by most asked or newest. Every filter is in the URL, so a filtered view can be shared as a link.
- **Jobs:** title, company, location, type, work mode, experience level, apply link, description and deadline. Filter by type, mode and experience. Jobs past their deadline are hidden unless you ask for them.
- **Companies:** every company with its question and job counts, linking to both sections.

## Run it

Needs Python 3.12+ and Node 20+.

```bash
./dev.sh                         # API on :8000, site on http://localhost:5173
```

To try it with demo data (fictional companies), run this once before starting:

```bash
cd backend && .venv/bin/python seed.py
```

Tests: `cd backend && .venv/bin/python -m pytest tests`

## Strict categories

The allowed categories, difficulties, rounds, job types, work modes and experience levels are defined once in [backend/taxonomy.py](backend/taxonomy.py). They are enforced:

1. in the UI, which only offers those options;
2. by the API, which rejects anything else (`422`);
3. by the database, through `CHECK` constraints.

The database constraints are created along with the database. After changing a list, delete `backend/data.db` (this erases all posts) or migrate the table.

## How it is built

```
backend/                  FastAPI + SQLite (single file: backend/data.db)
  main.py                 all API routes
  taxonomy.py             the fixed option lists
  db.py                   schema and connection helpers
  auth.py                 username/password accounts, cookie sessions (scrypt hashes)
  seed.py                 optional demo data
  tests/test_api.py
frontend/src/             React + TypeScript + React Router (Vite)
  pages/                  Questions, question detail, share form, Jobs, job detail, post form, Companies, Login
  components/ui.tsx       cards, 👍 button, filters, pagination
  lib/                    API client, session state, formatting
```

### Production

```bash
cd frontend && npm run build
cd ../backend && COOKIE_SECURE=true .venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000
```

The backend serves the built site. Put it behind HTTPS (`COOKIE_SECURE=true` requires it).

## Not built yet

Things a public launch would likely need: email verification, password reset, reporting and moderating posts, editing posts, comments or answers, and rate limiting on signups and posts.
