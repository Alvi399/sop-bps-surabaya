from sqlalchemy.orm import Session
from sqlalchemy import or_
import models  # ✅ ABSOLUTE IMPORT
import schemas  # ✅ ABSOLUTE IMPORT
from auth import get_password_hash
from datetime import datetime
import uuid
import base64
import uuid
from pathlib import Path

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
        is_active=True
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
    """Create new SOP with automatic revision creation"""
    
    file_url = None
    
    # Handle file
    if sop.file_base64:
        try:
            pdf_bytes = base64.b64decode(sop.file_base64)
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_code = sop.code.replace("/", "_").replace(" ", "_")
            filename = f"{safe_code}_{timestamp}.pdf"
            upload_dir = Path("uploaded_pdfs")
            upload_dir.mkdir(exist_ok=True)
            file_path = upload_dir / filename
            
            with open(file_path, "wb") as f:
                f.write(pdf_bytes)
            
            file_url = str(file_path)
            print(f"✅ File saved to: {file_path}")
        except Exception as e:
            print(f"❌ Error saving file: {e}")
    
    # ✅ Create SOP with status = draft dan approval_status = pending
    new_sop = models.SOPDocument(
        id=str(uuid.uuid4()),
        code=sop.code,
        title=sop.title,
        description=sop.description or "",
        department=sop.department,
        responsible_person=sop.responsible_person,
        status="draft",  # ✅ Status draft dulu
        approval_status="pending",  # ✅ Menunggu approval
        effective_date=sop.effective_date,
        expiry_date=sop.expiry_date,
        file_url=file_url,
        version=1,
        created_by=user_id,
        created_at=datetime.now(),
        updated_at=datetime.now(),
        # COP fields...
        tanggal_pembuatan=getattr(sop, 'tanggal_pembuatan', None),
        tanggal_revisi=getattr(sop, 'tanggal_revisi', None),
        tanggal_efektif=getattr(sop, 'tanggal_efektif', None),
        dasar_hukum=getattr(sop, 'dasar_hukum', None),
        kualifikasi_pelaksana=getattr(sop, 'kualifikasi_pelaksana', None),
        keterkaitan=getattr(sop, 'keterkaitan', None),
        peralatan_perlengkapan=getattr(sop, 'peralatan_perlengkapan', None),
        peringatan=getattr(sop, 'peringatan', None),
        pencatatan_pendataan=getattr(sop, 'pencatatan_pendataan', None),
        maksud=getattr(sop, 'maksud', None),
        tujuan=getattr(sop, 'tujuan', None),
        flowchart_steps=getattr(sop, 'flowchart_steps', None),
        pelaksana_columns=getattr(sop, 'pelaksana_columns', None),
    )
    
    db.add(new_sop)
    db.commit()
    db.refresh(new_sop)
    
    # ✅ Create revision otomatis untuk SOP baru
    revision = models.SOPRevision(
        id=str(uuid.uuid4()),
        sop_id=new_sop.id,
        title=f"SOP Baru: {new_sop.title}",
        version=1,
        changes_description="SOP baru dibuat dan menunggu persetujuan",
        revision_type="create",  # ✅ Type: create
        status="menunggu_persetujuan",
        revised_by=user_id,
        revision_date=datetime.now(),
        new_data={  # ✅ Simpan data SOP baru
            "code": new_sop.code,
            "title": new_sop.title,
            "department": new_sop.department,
            "responsible_person": new_sop.responsible_person,
        }
    )
    
    db.add(revision)
    db.commit()
    
    # Log activity
    create_activity_log(
        db,
        user_id=user_id,
        sop_id=new_sop.id,
        action="CREATE",
        description=f"Created SOP: {new_sop.code} (Pending Approval)"
    )
    
    return new_sop

def update_sop(db: Session, sop_id: str, sop_update: schemas.SOPUpdate, user_id: str):
    """Update SOP and create revision for approval"""
    db_sop = get_sop_by_id(db, sop_id)
    if not db_sop:
        return None
    
    # ✅ Simpan data lama
    old_data = {
        "title": db_sop.title,
        "description": db_sop.description,
        "department": db_sop.department,
        "responsible_person": db_sop.responsible_person,
        "status": db_sop.status,
    }
    
    # Update data
    update_data = sop_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_sop, field, value)
    
    # ✅ Set status ke pending approval
    db_sop.approval_status = "pending"
    db_sop.updated_by = user_id
    db_sop.updated_at = datetime.now()
    
    db.commit()
    db.refresh(db_sop)
    
    # ✅ Simpan data baru
    new_data = {
        "title": db_sop.title,
        "description": db_sop.description,
        "department": db_sop.department,
        "responsible_person": db_sop.responsible_person,
        "status": db_sop.status,
    }
    
    # ✅ Create revision untuk perubahan ini
    revision = models.SOPRevision(
        id=str(uuid.uuid4()),
        sop_id=db_sop.id,
        title=f"Update: {db_sop.title}",
        version=db_sop.version + 1,
        changes_description="SOP diperbarui dan menunggu persetujuan",
        revision_type="update",  # ✅ Type: update
        status="menunggu_persetujuan",
        revised_by=user_id,
        revision_date=datetime.now(),
        old_data=old_data,  # ✅ Data lama
        new_data=new_data,  # ✅ Data baru
    )
    
    db.add(revision)
    db.commit()
    
    # Log activity
    create_activity_log(
        db,
        user_id=user_id,
        sop_id=db_sop.id,
        action="UPDATE",
        description=f"Updated SOP: {db_sop.title} (Pending Approval)"
    )
    
    return db_sop

def delete_sop(db: Session, sop_id: str, user_id: str):
    db_sop = get_sop_by_id(db, sop_id)
    if not db_sop:
        return False
    
    # Add activity log before delete
    activity = models.ActivityLog(
        id=str(uuid.uuid4()),
        user_id=user_id,
        sop_id=db_sop.id,
        action="delete",
        description=f"Deleted SOP: {db_sop.title}"
    )
    db.add(activity)
    
    db.delete(db_sop)
    db.commit()
    return True

def search_sops(db: Session, query: str):
    return db.query(models.SOPDocument).filter(
        (models.SOPDocument.title.ilike(f"%{query}%")) |
        (models.SOPDocument.code.ilike(f"%{query}%")) |
        (models.SOPDocument.description.ilike(f"%{query}%"))
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
    
# ========================================
# REVISION CRUD
# ========================================

def get_revisions(db: Session, skip: int = 0, limit: int = 100):
    """Get all revisions"""
    return db.query(models.SOPRevision).order_by(
        models.SOPRevision.revision_date.desc()
    ).offset(skip).limit(limit).all()

def get_revision_by_id(db: Session, revision_id: str):
    """Get revision by ID"""
    return db.query(models.SOPRevision).filter(
        models.SOPRevision.id == revision_id
    ).first()

def get_revisions_by_sop(db: Session, sop_id: str):
    """Get all revisions for a specific SOP"""
    return db.query(models.SOPRevision).filter(
        models.SOPRevision.sop_id == sop_id
    ).order_by(models.SOPRevision.version.desc()).all()

def get_revisions_by_status(db: Session, status: str):
    """Get revisions by status"""
    return db.query(models.SOPRevision).filter(
        models.SOPRevision.status == status
    ).order_by(models.SOPRevision.revision_date.desc()).all()

def create_revision(db: Session, revision: schemas.SOPRevisionCreate, user_id: str):
    """Create new revision"""
    db_revision = models.SOPRevision(
        id=str(uuid.uuid4()),
        sop_id=revision.sop_id,
        title=revision.title,
        version=revision.version,
        changes_description=revision.changes_description,
        status=revision.status,
        revised_by=user_id,
        revision_date=datetime.now()
    )
    
    db.add(db_revision)
    db.commit()
    db.refresh(db_revision)
    
    # Log activity
    create_activity_log(
        db=db,
        user_id=user_id,
        sop_id=revision.sop_id,
        action="create_revision",
        description=f"Created revision v{revision.version} for SOP: {revision.title}"
    )
    
    return db_revision

def update_revision(db: Session, revision_id: str, revision_update: schemas.SOPRevisionUpdate, user_id: str):
    """Update revision"""
    db_revision = get_revision_by_id(db, revision_id)
    if not db_revision:
        return None
    
    update_data = revision_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_revision, field, value)
    
    db_revision.updated_at = datetime.now()
    
    db.commit()
    db.refresh(db_revision)
    
    return db_revision

def approve_revision(db: Session, revision_id: str, user_id: str, review_notes: str = ""):
    """Approve revision and activate SOP"""
    db_revision = get_revision_by_id(db, revision_id)
    if not db_revision:
        return None
    
    # Update revision status
    db_revision.status = "disetujui"
    db_revision.reviewed_by = user_id
    db_revision.approval_date = datetime.now()
    db_revision.review_notes = review_notes
    
    # ✅ Update SOP: set ke active dan approved
    sop = get_sop_by_id(db, db_revision.sop_id)
    if sop:
        sop.version = db_revision.version
        sop.status = "active"  # ✅ Aktifkan SOP
        sop.approval_status = "approved"  # ✅ Status approved
        sop.approved_by = user_id
        sop.updated_at = datetime.now()
        sop.updated_by = user_id
    
    db.commit()
    db.refresh(db_revision)
    
    # Log activity
    create_activity_log(
        db=db,
        user_id=user_id,
        sop_id=db_revision.sop_id,
        action="APPROVE",
        description=f"Approved revision v{db_revision.version}: {db_revision.title}"
    )
    
    return db_revision

def reject_revision(db: Session, revision_id: str, user_id: str, reject_reason: str):
    """Reject revision"""
    db_revision = get_revision_by_id(db, revision_id)
    if not db_revision:
        return None
    
    db_revision.status = "ditolak"
    db_revision.reviewed_by = user_id
    db_revision.approval_date = datetime.now()
    db_revision.review_notes = reject_reason
    
    # ✅ Update SOP: set approval_status ke rejected
    sop = get_sop_by_id(db, db_revision.sop_id)
    if sop:
        sop.approval_status = "rejected"
        sop.status = "draft"  # ✅ Kembali ke draft
    
    db.commit()
    db.refresh(db_revision)
    
    # Log activity
    create_activity_log(
        db=db,
        user_id=user_id,
        sop_id=db_revision.sop_id,
        action="REJECT",
        description=f"Rejected revision v{db_revision.version}: {reject_reason}"
    )
    
    return db_revision

def delete_revision(db: Session, revision_id: str, user_id: str):
    """Delete revision"""
    db_revision = get_revision_by_id(db, revision_id)
    if not db_revision:
        return False
    
    # Log before delete
    create_activity_log(
        db=db,
        user_id=user_id,
        sop_id=db_revision.sop_id,
        action="delete_revision",
        description=f"Deleted revision v{db_revision.version}: {db_revision.title}"
    )
    
    db.delete(db_revision)
    db.commit()
    return True