from datetime import datetime, timedelta
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from ..config import settings
from ..mongo import get_db, get_client
from ..database import get_db as get_sql_session
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from .models import User
from . import schemas, utils, models
from ..dependencies import get_current_user

router = APIRouter()


class RegisterIn(BaseModel):
    email: str
    password: str
    role: str = "user"


@router.post('/register')
async def register(data: RegisterIn, db = Depends(get_db)):
    data.email = data.email.strip().lower()
    users = db.get_collection("users")
    existing = await users.find_one({"email": data.email})
    if existing:
        if utils.verify_password("", existing.get("hashed_password", "")):
            await users.update_one(
                {"_id": existing["_id"]},
                {"$set": {"hashed_password": utils.get_password_hash(data.password), "role": data.role or existing.get("role", "user")}}
            )
            return {"email": existing["email"], "role": data.role or existing.get("role", "user")}
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    hashed = utils.get_password_hash(data.password)
    await users.insert_one({"email": data.email, "hashed_password": hashed, "role": data.role})
    return {"email": data.email, "role": data.role}


class LoginIn(BaseModel):
    email: str
    password: str


@router.post('/login')
async def login(data: LoginIn, db = Depends(get_db), sql_session = Depends(get_sql_session)):
    # Quick DB availability check to avoid long hangs if Mongo is down
    try:
        await get_client().admin.command('ping')
    except Exception as e:
        logging.exception("MongoDB ping failed during /auth/login: %s", e)
        # Dev fallback: allow login with DEV_ADMIN credentials when DB is unavailable
        if settings.DEV_ADMIN_EMAIL and settings.DEV_ADMIN_PASSWORD:
            req_email = data.email.strip().lower()
            dev_email = settings.DEV_ADMIN_EMAIL.strip().lower()
            if req_email == dev_email:
                if data.password == settings.DEV_ADMIN_PASSWORD:
                    token = utils.create_access_token({"sub": dev_email, "role": "authority"})
                    return {"access_token": token, "token_type": "bearer", "dev_fallback": True}
                # Same email but wrong password -> 401 to guide user instead of 503
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')
        # Demo fallback: accept any email if DEMO_FALLBACK_PASSWORD is set
        if settings.DEMO_FALLBACK_PASSWORD and data.password == settings.DEMO_FALLBACK_PASSWORD:
            role = settings.DEMO_FALLBACK_ROLE or 'user'
            email = data.email.strip().lower()
            token = utils.create_access_token({"sub": email, "role": role})
            return {"access_token": token, "token_type": "bearer", "demo_fallback": True}
        # Attempt SQLite fallback (users table) if available
        try:
            q = await sql_session.execute(select(User).where(User.email == data.email.strip().lower()))
            user_obj: User | None = q.scalar_one_or_none()
            if user_obj and utils.verify_password(data.password, user_obj.hashed_password):
                token = utils.create_access_token({"sub": user_obj.email, "role": user_obj.role or 'user'})
                return {"access_token": token, "token_type": "bearer", "sql_fallback": True}
        except SQLAlchemyError as se:
            logging.warning("SQLite fallback failed: %s", se)
        # Different email (requires DB) or no DEV admin configured -> 503
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail='Database unavailable')
    data.email = data.email.strip().lower()
    users = db.get_collection("users")
    user = await users.find_one({"email": data.email})
    if not user or not utils.verify_password(data.password, user.get("hashed_password", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    token = utils.create_access_token({"sub": user["email"], "role": user.get("role", "user")})
    return {"access_token": token, "token_type": "bearer"}


class OtpSendIn(BaseModel):
    email: str


@router.post('/otp/send')
async def send_otp(data: OtpSendIn, db = Depends(get_db)):
    data.email = data.email.strip().lower()
    from .smtp_otp import send_otp
    otp = send_otp(data.email)
    # persist OTP with expiry (5 minutes)
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    otps = db.get_collection("otp_tokens")
    await otps.insert_one({"email": data.email, "otp": otp, "expires_at": expires_at})
    if not settings.SMTP_USER:
        return {"status": "otp_sent", "otp": otp}
    return {"status": "otp_sent"}


class OtpVerifyIn(BaseModel):
    email: str
    otp: str


@router.post('/otp/verify')
async def verify_otp(data: OtpVerifyIn, db = Depends(get_db)):
    data.email = data.email.strip().lower()
    otps = db.get_collection("otp_tokens")
    otp_rec = await otps.find_one({"email": data.email}, sort=[("_id", -1)])
    if not otp_rec or otp_rec.get("otp") != data.otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")
    if otp_rec.get("expires_at") < datetime.utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OTP expired")
    await otps.delete_many({"email": data.email})
    users = db.get_collection("users")
    user = await users.find_one({"email": data.email})
    if not user:
        await users.insert_one({"email": data.email, "hashed_password": utils.get_password_hash(""), "role": "user"})
        user = await users.find_one({"email": data.email})
    token = utils.create_access_token({"sub": user["email"], "role": user.get("role", "user")})
    return {"access_token": token, "token_type": "bearer"}


class MeOut(BaseModel):
    email: str
    role: str
    profile: dict | None = None


class MeUpdateIn(BaseModel):
    profile: dict | None = None


@router.get('/me', response_model=MeOut)
async def get_me(db=Depends(get_db), user=Depends(get_current_user)):
    try:
        await get_client().admin.command('ping')
    except Exception as e:
        logging.exception("MongoDB ping failed during GET /auth/me: %s", e)
        # Dev fallback: return info from token when DB is unavailable
        return {
            "email": user.get("sub"),
            "role": user.get("role", "user"),
            "profile": None,
        }
    users = db.get_collection("users")
    doc = await users.find_one({"email": user.get("sub")})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {
        "email": doc.get("email"),
        "role": doc.get("role", "user"),
        "profile": doc.get("profile"),
    }


@router.patch('/me', response_model=MeOut)
async def update_me(data: MeUpdateIn, db=Depends(get_db), user=Depends(get_current_user)):
    try:
        await get_client().admin.command('ping')
    except Exception as e:
        logging.exception("MongoDB ping failed during PATCH /auth/me: %s", e)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail='Database unavailable')
    users = db.get_collection("users")
    email = user.get("sub")
    updates = {}
    if data.profile is not None:
        updates["profile"] = data.profile
    if updates:
        await users.update_one({"email": email}, {"$set": updates}, upsert=True)
    doc = await users.find_one({"email": email})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return {
        "email": doc.get("email"),
        "role": doc.get("role", "user"),
        "profile": doc.get("profile"),
    }
