from pydantic import BaseModel

class UserCreate(BaseModel):
    email: str
    password: str
    role: str = 'user'

class UserOut(BaseModel):
    id: int | None = None
    email: str
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str = 'bearer'
