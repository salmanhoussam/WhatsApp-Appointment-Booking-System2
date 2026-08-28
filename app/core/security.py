# app/core/security.py
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from jwt.exceptions import InvalidTokenError
import bcrypt
from app.core.config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

def verify_password(plain_password: str, hashed_password: Optional[str]) -> bool:
    # No hash set at all (e.g. a Client root account that was never given a password) --
    # fail closed instead of crashing. Found 2026-08-28: client_login() passes
    # client.password_hash straight through, and a NULL value here previously raised an
    # unhandled AttributeError ('NoneType' object has no attribute 'startswith'), a real
    # 500 for any identifier that resolves to a real Client with no password set.
    if not hashed_password:
        return False
    # Only bcrypt comparison — no plain-text fallback.
    if not hashed_password.startswith("$2"):
        return False
    # bcrypt silently truncates at 72 bytes — reject before hashing to avoid
    # two different passwords mapping to the same hash (CHECK-SEC-09).
    if len(plain_password.encode('utf-8')) > 72:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except ValueError:
        return False

def get_password_hash(password: str) -> str:
    if len(password.encode('utf-8')) > 72:
        raise ValueError("Password exceeds 72 bytes — bcrypt truncation risk")
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except InvalidTokenError:
        return None


# Alias — new code should use decode_access_token; decode_token stays for compat
decode_access_token = decode_token