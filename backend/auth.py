"""Username/password accounts with cookie sessions."""

import hashlib
import hmac
import secrets

from fastapi import Cookie, HTTPException

from db import transaction

COOKIE = "session"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=2**14, r=8, p=1)
    return f"{salt.hex()}${digest.hex()}"


def check_password(password: str, stored: str) -> bool:
    salt_hex, digest_hex = stored.split("$")
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt_hex), n=2**14, r=8, p=1)
    return hmac.compare_digest(digest.hex(), digest_hex)


def new_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with transaction() as conn:
        conn.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user_id))
    return token


def end_session(token: str) -> None:
    with transaction() as conn:
        conn.execute("DELETE FROM sessions WHERE token = ?", (token,))


def optional_user(session: str | None = Cookie(default=None)) -> dict | None:
    """FastAPI dependency: the signed-in user, or None."""
    if not session:
        return None
    with transaction() as conn:
        row = conn.execute(
            "SELECT users.id, users.username FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ?",
            (session,),
        ).fetchone()
    return dict(row) if row else None


def require_user(session: str | None = Cookie(default=None)) -> dict:
    """FastAPI dependency: the signed-in user, or a 401."""
    user = optional_user(session)
    if user is None:
        raise HTTPException(401, "Please sign in first.")
    return user
