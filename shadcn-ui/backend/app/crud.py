from sqlalchemy.orm import Session
from sqlalchemy import or_
from . import models, schemas
from .auth import get_password_hash
from datetime import datetime
import uuid

# User CRUD
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_user_by_id(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        id=str(uuid.uuid4()),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        department=user.department,
        phone=user.phone,
        password_hash=hashed_password,
        join_date=datetime.now().date()
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_last_login(db: Session, user_id: str):
    db.query(models.User).filter(models.User.id == user_id).update(
        {"last_login": datetime.now()}
    )
    db.commit()

# SOP CRUD
def get_sops(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.SOPDocument).offset(skip).limit(limit).all()

def get_sop_by_id(db: Session, sop_id: str):
    return db.query(models.SOPDocument).filter(models.SOPDocument.id == sop_id).first()

def get_sop_by_code(db: Session, code: str):
    return db.query(models.SOPDocument).filter(models.SOPDocument.code == code).first()

def create_sop(db: Session, sop: schemas.SOPCreate, user_id: str):
    db_sop = models.SOPDocument(
        id=str(uuid.uuid4()),
        **sop.dict(),
        created_by=user_id
    )
    db.add(db_sop)
    db.commit()
    db.refresh(db_sop)
    
    # Log activity
    create_activity_log(
        db, user_id, db_sop.id, "create", 
        f"SOP {db_sop.title} created"
    )
    
    return db_sop

def update_sop(db: Session, sop_id: str, sop_update: schemas.SOPUpdate, user_id: str):
    db_sop = get_sop_by_id(db, sop_id)
    if not db_sop:
        return None
    
    update_data = sop_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_sop, field, value)
    
    db_sop.updated_by = user_id
    db.commit()
    db.refresh(db_sop)
    
    # Log activity
    create_activity_log(
        db, user_id, sop_id, "update",
        f"SOP {db_sop.title} updated"
    )
    
    return db_sop

def delete_sop(db: Session, sop_id: str, user_id: str):
    db_sop = get_sop_by_id(db, sop_id)
    if not db_sop:
        return False
    
    # Log activity before delete
    create_activity_log(
        db, user_id, sop_id, "delete",
        f"SOP {db_sop.title} deleted"
    )
    
    db.delete(db_sop)
    db.commit()
    return True

def search_sops(db: Session, query: str):
    return db.query(models.SOPDocument).filter(
        or_(
            models.SOPDocument.title.ilike(f"%{query}%"),
            models.SOPDocument.code.ilike(f"%{query}%"),
            models.SOPDocument.description.ilike(f"%{query}%")
        )
    ).all()

# Activity Log CRUD
def create_activity_log(db: Session, user_id: str, sop_id: str, action: str, description: str):
    log = models.ActivityLog(
        id=str(uuid.uuid4()),
        user_id=user_id,
        sop_id=sop_id,
        action=action,
        description=description
    )
    db.add(log)
    db.commit()
    return log

def get_activity_logs(db: Session, limit: int = 50):
    return db.query(models.ActivityLog).order_by(
        models.ActivityLog.created_at.desc()
    ).limit(limit).all()