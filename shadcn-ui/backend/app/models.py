from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, ForeignKey, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, index=True)
    department = Column(String(255), nullable=False, index=True)
    phone = Column(String(50))
    avatar_url = Column(Text)
    is_active = Column(Boolean, default=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    join_date = Column(Date)
    last_login = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    sops_created = relationship("SOPDocument", foreign_keys="SOPDocument.created_by", back_populates="creator")
    sops_approved = relationship("SOPDocument", foreign_keys="SOPDocument.approved_by", back_populates="approver")
    activity_logs = relationship("ActivityLog", back_populates="user")


class SOPDocument(Base):
    __tablename__ = "sop_documents"

    id = Column(String(50), primary_key=True)
    code = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    department = Column(String(255), nullable=False, index=True)
    responsible_person = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, index=True)
    effective_date = Column(Date, nullable=False)
    expiry_date = Column(Date)
    version = Column(Integer, default=1)
    file_url = Column(Text)  # Store base64 or file path
    created_by = Column(String(50), ForeignKey("users.id"))
    approved_by = Column(String(50), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    updated_by = Column(String(50), ForeignKey("users.id"))

    # Relationships
    creator = relationship("User", foreign_keys=[created_by], back_populates="sops_created")
    approver = relationship("User", foreign_keys=[approved_by], back_populates="sops_approved")
    revisions = relationship("SOPRevision", back_populates="sop", cascade="all, delete-orphan")
    activity_logs = relationship("ActivityLog", back_populates="sop")


class SOPRevision(Base):
    __tablename__ = "sop_revisions"

    id = Column(String(50), primary_key=True)
    sop_id = Column(String(50), ForeignKey("sop_documents.id", ondelete="CASCADE"), nullable=False)
    version = Column(Integer, nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    changes_description = Column(Text, nullable=False)
    file_url = Column(Text)
    status = Column(String(50), nullable=False, index=True)
    revised_by = Column(String(50), ForeignKey("users.id"))
    reviewed_by = Column(String(50), ForeignKey("users.id"))
    revision_date = Column(DateTime(timezone=True), server_default=func.now())
    approval_date = Column(DateTime(timezone=True))
    review_notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    sop = relationship("SOPDocument", back_populates="revisions")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(String(50), primary_key=True)
    user_id = Column(String(50), ForeignKey("users.id"))
    sop_id = Column(String(50), ForeignKey("sop_documents.id", ondelete="SET NULL"))
    action = Column(String(50), nullable=False)
    description = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", back_populates="activity_logs")
    sop = relationship("SOPDocument", back_populates="activity_logs")