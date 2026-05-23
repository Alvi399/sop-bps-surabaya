from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from typing import Optional

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    department: str
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str
    role: str = "staf"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    role: str
    avatar_url: Optional[str]
    is_active: bool
    join_date: Optional[date]
    last_login: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

# SOP Schemas
class SOPBase(BaseModel):
    code: str
    title: str
    description: Optional[str]
    department: str
    responsible_person: str
    status: str
    effective_date: date
    expiry_date: Optional[date]

class SOPCreate(SOPBase):
    file_url: Optional[str] = None

class SOPUpdate(BaseModel):
    title: Optional[str]
    description: Optional[str]
    department: Optional[str]
    responsible_person: Optional[str]
    status: Optional[str]
    effective_date: Optional[date]
    expiry_date: Optional[date]
    file_url: Optional[str]

class SOPResponse(SOPBase):
    id: str
    version: int
    file_url: Optional[str]
    created_by: str
    approved_by: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None