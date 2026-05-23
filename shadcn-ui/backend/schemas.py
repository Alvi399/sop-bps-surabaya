from pydantic import BaseModel, EmailStr
from datetime import datetime, date
from typing import Optional, List

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
    avatar_url: Optional[str] = None
    is_active: bool
    join_date: Optional[date] = None
    last_login: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# SOP Schemas
class SOPBase(BaseModel):
    code: str
    title: str
    description: Optional[str] = None
    department: str
    responsible_person: str
    status: str = "draft"
    approval_status: str = "pending"  # ✅ TAMBAH
    effective_date: str
    expiry_date: Optional[str] = None

class SOPCreate(SOPBase):
    file_url: Optional[str] = None  # For base64 PDF
    # ✅ Tambah field COP
    tanggal_pembuatan: Optional[str] = None
    tanggal_revisi: Optional[str] = None
    tanggal_efektif: Optional[str] = None
    dasar_hukum: Optional[str] = None
    kualifikasi_pelaksana: Optional[str] = None
    keterkaitan: Optional[str] = None
    peralatan_perlengkapan: Optional[str] = None
    peringatan: Optional[str] = None
    pencatatan_pendataan: Optional[str] = None
    maksud: Optional[str] = None
    tujuan: Optional[str] = None
    flowchart_steps: Optional[str] = None
    pelaksana_columns: Optional[str] = None
    file_base64: Optional[str] = None

class SOPUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    responsible_person: Optional[str] = None
    status: Optional[str] = None
    effective_date: Optional[str] = None
    expiry_date: Optional[str] = None

class SOPResponse(SOPBase):
    id: str
    version: int
    created_by: str
    approved_by: Optional[str] = None  # ✅ TAMBAH
    approval_date: Optional[datetime] = None  # ✅ TAMBAH
    rejection_reason: Optional[str] = None  # ✅ TAMBAH
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        
# ✅ REVISION SCHEMAS
class SOPRevisionBase(BaseModel):
    sop_id: str
    title: str
    version: int
    changes_description: str
    status: str = "menunggu_persetujuan"

class SOPRevisionCreate(SOPRevisionBase):
    pass

class SOPRevisionUpdate(BaseModel):
    title: Optional[str] = None
    changes_description: Optional[str] = None
    status: Optional[str] = None
    reviewed_by: Optional[str] = None
    approval_date: Optional[datetime] = None
    review_notes: Optional[str] = None

class SOPRevisionResponse(SOPRevisionBase):
    id: str
    revised_by: str
    reviewed_by: Optional[str] = None
    revision_date: datetime
    approval_date: Optional[datetime] = None
    review_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

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