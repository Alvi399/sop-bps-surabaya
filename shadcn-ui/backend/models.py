from sqlalchemy import Column, String, Integer, Date, DateTime, Boolean, Text, JSON
from sqlalchemy.sql import func
from database import Base
import uuid


class User(Base):
    __tablename__ = "users"
    __table_args__ = {'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="staf")
    department = Column(String(255))
    phone = Column(String(50))
    avatar_url = Column(String(500))
    is_active = Column(Boolean, default=True)
    join_date = Column(Date, default=func.current_date())
    last_login = Column(DateTime)
    created_at = Column(DateTime, default=func.now())


class SOPDocument(Base):
    __tablename__ = "sop_documents"
    __table_args__ = {'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text(length=4294967295))       # LONGTEXT di MySQL
    department = Column(String(255), nullable=False)
    responsible_person = Column(String(255), nullable=False)
    
    status = Column(String(50), nullable=False, default="draft")
    approval_status = Column(String(50), nullable=False, default="pending")
    
    effective_date = Column(Date, nullable=False)
    expiry_date = Column(Date)
    version = Column(Integer, default=1)
    file_url = Column(Text)
    created_by = Column(String(36), nullable=False)
    approved_by = Column(String(36))
    updated_by = Column(String(36))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    # Field COP
    tanggal_pembuatan = Column(Date)
    tanggal_revisi = Column(Date)
    tanggal_efektif = Column(Date)
    dasar_hukum = Column(Text(length=4294967295))           # LONGTEXT
    kualifikasi_pelaksana = Column(Text(length=4294967295)) # LONGTEXT
    keterkaitan = Column(Text(length=4294967295))           # LONGTEXT
    peralatan_perlengkapan = Column(Text(length=4294967295))# LONGTEXT
    peringatan = Column(Text(length=4294967295))            # LONGTEXT
    pencatatan_pendataan = Column(Text(length=4294967295))  # LONGTEXT
    maksud = Column(Text(length=4294967295))                # LONGTEXT
    tujuan = Column(Text(length=4294967295))                # LONGTEXT
    flowchart_steps = Column(JSON)
    pelaksana_columns = Column(JSON)


class SOPRevision(Base):
    __tablename__ = "sop_revisions"
    __table_args__ = {'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sop_id = Column(String(36), nullable=False)
    title = Column(String(500), nullable=False)
    version = Column(Integer, nullable=False)
    changes_description = Column(Text(length=4294967295), nullable=False)  # LONGTEXT
    revision_type = Column(String(50), nullable=False, default="update")
    status = Column(String(100), nullable=False, default="menunggu_persetujuan")
    revised_by = Column(String(36), nullable=False)
    reviewed_by = Column(String(36))
    revision_date = Column(DateTime, default=func.now())
    approval_date = Column(DateTime)
    review_notes = Column(Text(length=4294967295))         # LONGTEXT
    
    old_data = Column(JSON)
    new_data = Column(JSON)
    
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class ActivityLog(Base):
    __tablename__ = "activity_logs"
    __table_args__ = {'mysql_charset': 'utf8mb4', 'mysql_collate': 'utf8mb4_unicode_ci'}

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False)
    sop_id = Column(String(36))
    action = Column(String(100), nullable=False)
    description = Column(Text(length=4294967295))  # LONGTEXT
    created_at = Column(DateTime, default=func.now())