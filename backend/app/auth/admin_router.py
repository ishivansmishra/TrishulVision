from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from ..mongo import get_db
from ..dependencies import require_role

router = APIRouter(prefix="/admin", tags=["admin"])


class RoleUpdateIn(BaseModel):
  email: str
  role: str


@router.post('/users/role')
async def update_user_role(body: RoleUpdateIn, db=Depends(get_db), admin=Depends(require_role('authority'))):
    # Treat 'authority' as admin for simplicity. You can tighten this later.
    body.email = body.email.strip().lower()
    if body.role not in ("authority", "user"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid role")
    users = db.get_collection('users')
    res = await users.update_one({"email": body.email}, {"$set": {"role": body.role}})
    if res.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    return {"status": "ok", "email": body.email, "role": body.role}
