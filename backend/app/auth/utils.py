from passlib.context import CryptContext
from passlib.exc import UnknownHashError
from datetime import datetime, timedelta
from jose import jwt
from ..config import settings

# Use PBKDF2-SHA256 to avoid bcrypt's 72-byte password limit and Windows backend issues
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed: str) -> bool:
    """
    Safely verify a password against a stored hash.
    - Returns False if the stored hash is missing/empty or in an unknown format,
      instead of raising and causing a 500.
    """
    if not hashed:
        return False
    try:
        return pwd_context.verify(plain_password, hashed)
    except UnknownHashError:
        # Handle legacy/invalid hashes gracefully
        return False

def create_access_token(data: dict, expires_delta: int = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=(expires_delta or settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded
