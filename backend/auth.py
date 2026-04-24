import os
from datetime import datetime, timedelta
from jose import jwt
import secrets

SECRET_KEY = os.getenv("SECRET_KEY", "very-super-mega-long-random-string-")
ALGORITHM  = "HS256"


def create_magic_token() -> str:
    return secrets.token_urlsafe(32)


def create_jwt(user_id: int, is_admin: bool) -> str:
    payload = {
        "sub":      str(user_id),
        "is_admin": is_admin,
        "exp":      datetime.utcnow() + timedelta(days=30),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_jwt(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])