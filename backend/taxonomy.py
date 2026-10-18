"""The fixed option lists. Questions and jobs may only use these values.

They are enforced in three places: the API (request validation), the
database (CHECK constraints) and the UI (dropdowns built from /api/meta).

The CHECK constraints are written when the database file is first created.
After changing a list here, delete backend/data.db (losing its data) or
migrate the table, or the database will keep rejecting the new values.
"""

QUESTION_CATEGORIES = (
    "DSA",
    "LLD",
    "HLD",
    "AI Coding",
    "Machine Learning",
    "SQL",
    "CS Fundamentals",
    "Frontend",
    "Behavioral",
    "Other",
)

CATEGORY_DESCRIPTIONS = {
    "DSA": "Data structures and algorithms problems",
    "LLD": "Low-level design: classes, interfaces, design patterns",
    "HLD": "High-level / system design: services, scaling, storage",
    "AI Coding": "Coding rounds where AI assistants are allowed or required",
    "Machine Learning": "ML theory, modeling and ML system questions",
    "SQL": "Database queries and schema design",
    "CS Fundamentals": "OS, networking, DBMS, OOP concepts",
    "Frontend": "JavaScript, React, browser and UI questions",
    "Behavioral": "Leadership principles, past experience, HR",
    "Other": "Anything that does not fit above",
}

DIFFICULTIES = ("Easy", "Medium", "Hard")

ROUNDS = (
    "Online Assessment",
    "Phone Screen",
    "Technical Interview",
    "System Design Round",
    "Hiring Manager",
    "HR",
    "Other",
)

JOB_TYPES = ("Full-time", "Internship", "Part-time", "Contract")

WORK_MODES = ("On-site", "Remote", "Hybrid")

EXPERIENCE_LEVELS = ("Student / Intern", "New Grad", "0-2 years", "2-5 years", "5+ years")
