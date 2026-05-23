from fastapi import FastAPI, UploadFile, Form, Depends, HTTPException, status, File
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from sqlalchemy.orm import Session
from pydantic import BaseModel
import fitz  # PyMuPDF
import os
import uuid
import shutil
import base64
from pathlib import Path
from datetime import timedelta
from datetime import datetime
from typing import List, Optional
from mangum import Mangum

# ✅ IMPORT HANYA SEKALI (hapus duplikasi)
from database import engine, get_db, Base
from config import settings
import models
import schemas
import crud
from auth import (
    verify_password, 
    create_access_token, 
    get_current_user,
    require_role,
    get_password_hash
)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,  # dari config
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Folders
UPLOAD_DIR = "sop_files"
PDF_STORAGE = "uploaded_pdfs" 
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PDF_STORAGE, exist_ok=True)

# ========================================
# HELPER FUNCTIONS (PDF Editing)
# ========================================

def extract_font_info(page, rect):
    """Ekstrak informasi font dari area tertentu"""
    try:
        blocks = page.get_text("dict")["blocks"]
        for block in blocks:
            if "lines" in block:
                for line in block["lines"]:
                    for span in line["spans"]:
                        span_rect = fitz.Rect(span["bbox"])
                        if span_rect.intersects(rect):
                            return {
                                "size": span["size"],
                                "font": span["font"],
                                "color": span["color"]
                            }
    except:
        pass
    return {"size": 10, "font": "helv", "color": 0}


# ========================================
# AUTH ENDPOINTS
# ========================================

@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register new user"""
    db_user = crud.get_user_by_email(db, user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    return crud.create_user(db, user)

@app.post("/api/auth/login")
async def login(credentials: dict, db: Session = Depends(get_db)):
    email = credentials.get("email")
    password = credentials.get("password")
    
    print(f"🔐 Login attempt:")
    print(f"   Email: {email}")
    print(f"   Password: {password}")
    
    # Find user
    user = db.query(models.User).filter(models.User.email == email).first()
    
    if not user:
        print(f"❌ User not found: {email}")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    print(f"✅ User found!")
    print(f"   Email: {user.email}")
    print(f"   Hash: {user.password_hash[:50]}...")
    
    # Verify password
    print(f"🔍 Verifying password...")
    is_valid = verify_password(password, user.password_hash)
    
    if not is_valid:
        print(f"❌ Password verification failed!")
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    print(f"✅ Password verified successfully!")
    
    # Create token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"id": user.id, "email": user.email},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "department": user.department,
            "is_active": user.is_active
        }
    }

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    """Get current user info"""
    return current_user


# ========================================
# SOP ENDPOINTS
# ========================================

@app.get("/api/sops")
def get_all_sops(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all SOPs"""
    sops = crud.get_sops(db, skip=skip, limit=limit)
    return sops

@app.get("/api/sops/{sop_id}")
def get_sop(
    sop_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get SOP by ID"""
    print(f"📋 Fetching SOP: {sop_id}")
    
    sop = crud.get_sop_by_id(db, sop_id)
    
    if not sop:
        print(f"❌ SOP not found: {sop_id}")
        raise HTTPException(status_code=404, detail="SOP not found")
    
    print(f"✅ SOP found: {sop.code}")
    return sop

# ✅ HILANGKAN DUPLIKASI - hanya ada satu endpoint POST /api/sops
@app.post("/api/sops")
async def create_sop(
    sop_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        # 1. Ambil file_base64
        file_base64 = sop_data.get("file_base64")
        
        file_url = None
        file_path = None
        
        # 2. Jika ada base64, simpan ke file
        if file_base64:
            # Decode base64
            pdf_bytes = base64.b64decode(file_base64)
            
            # Buat nama file unik
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_code = sop_data.get("code", "SOP").replace("/", "_")
            filename = f"{safe_code}_{timestamp}.pdf"
            
            # Path lengkap ke folder uploaded_pdfs
            upload_dir = Path("uploaded_pdfs")
            upload_dir.mkdir(exist_ok=True)
            
            file_path = upload_dir / filename
            
            # Simpan file
            with open(file_path, "wb") as f:
                f.write(pdf_bytes)
            
            # URL untuk diakses (gunakan path relatif)
            file_url = str(file_path)
            
            print(f"✅ File saved: {file_path}")
            print(f"🔗 File URL: {file_url}")
        
        # 3. Simpan ke database
        new_sop = models.SOPDocument(
            id=str(uuid.uuid4()),
            code=sop_data.get("code"),
            title=sop_data.get("title"),
            description=sop_data.get("description", ""),
            department=sop_data.get("department"),
            responsible_person=sop_data.get("responsible_person"),
            status="draft",  # ✅ Default draft
            approval_status="pending",  # ✅ Menunggu approval
            effective_date=sop_data.get("effective_date"),
            expiry_date=sop_data.get("expiry_date"),
            file_url=file_url,
            version=1,
            created_by=current_user.id,
            created_at=datetime.now(),
            updated_at=datetime.now(),
        )
        
        db.add(new_sop)
        db.commit()
        db.refresh(new_sop)
        
        # ✅ TAMBAHKAN INI - Log activity
        crud.create_activity_log(
            db=db,
            user_id=current_user.id,
            sop_id=new_sop.id,
            action="create",
            description=f"Created SOP: {new_sop.title}"
        )
        
        print(f"✅ SOP created: {new_sop.code}")
        print(f"📝 Activity logged")
        
        return {"message": "SOP created", "sop": new_sop}
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/sops/{sop_id}")
def update_sop_endpoint(
    sop_id: str,
    sop_update: schemas.SOPUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "kepala_bagian"]))
):
    """Update SOP"""
    updated = crud.update_sop(db, sop_id, sop_update, current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="SOP not found")
    
    crud.create_activity_log(
        db=db,
        user_id=current_user.id,
        sop_id=updated.id,
        action="update",
        description=f"Updated SOP: {updated.title}"
    )
    
    return updated

@app.delete("/api/sops/{sop_id}")
def delete_sop_endpoint(
    sop_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    """Delete SOP"""
    # Get SOP before delete
    sop = crud.get_sop_by_id(db, sop_id)
    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")
    
    # ✅ Log activity SEBELUM delete
    crud.create_activity_log(
        db=db,
        user_id=current_user.id,
        sop_id=sop.id,
        action="delete",
        description=f"Deleted SOP: {sop.title}"
    )
    
    # Delete SOP
    success = crud.delete_sop(db, sop_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="SOP not found")
    
    return {"message": "SOP deleted successfully"}

@app.get("/api/sops/search/{query}")
def search_sops_endpoint(
    query: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Search SOPs"""
    return crud.search_sops(db, query)


# ========================================
# SERVE PDF FILES
# ========================================

@app.get("/pdfs/{filename}")
async def get_pdf(filename: str):
    """Serve PDF file from storage"""
    file_path = os.path.join(PDF_STORAGE, filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=404, 
            detail="File not found"
        )
    
    return FileResponse(
        file_path,
        media_type="application/pdf",
        filename=filename
    )

# ========================================
# ACTIVITY LOGS
# ========================================

@app.get("/api/activities")
def get_activities(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get activity logs"""
    return crud.get_activity_logs(db, limit)


# ========================================
# PDF EDITING ENDPOINTS
# ========================================

@app.post("/edit-pdf/")
async def edit_pdf(
    file: UploadFile,
    old_text: str = Form(...),
    new_text: str = Form(...),
):
    """Edit PDF - ganti teks"""
    try:
        temp_filename = f"{uuid.uuid4()}_{file.filename}"
        temp_path = os.path.join(UPLOAD_DIR, temp_filename)

        with open(temp_path, "wb") as f:
            f.write(await file.read())

        doc = fitz.open(temp_path)
        replaced = 0
        replacements = []

        for page_num, page in enumerate(doc):
            text_instances = page.search_for(old_text)
            
            if not text_instances and old_text.isdigit():
                full_text = page.get_text()
                if old_text in full_text:
                    text_instances = page.search_for(old_text)
            
            for inst in text_instances:
                font_info = extract_font_info(page, inst)
                replacements.append({
                    "page": page_num,
                    "rect": inst,
                    "font_info": font_info
                })
                replaced += 1

        if replaced == 0:
            doc.close()
            os.remove(temp_path)
            return JSONResponse(
                {"message": f"Teks '{old_text}' tidak ditemukan"},
                status_code=404,
            )

        for item in replacements:
            page = doc[item["page"]]
            rect = item["rect"]
            font_info = item["font_info"]
            
            font_size = font_info["size"] if font_info["size"] >= 8 else rect.height * 0.8
            
            redact_rect = fitz.Rect(
                rect.x0 - 0.5, rect.y0 - 0.5,
                rect.x1 + 0.5, rect.y1 + 0.5
            )
            
            page.add_redact_annot(redact_rect, fill=(1, 1, 1))
            page.apply_redactions()
            
            page.insert_text(
                (rect.x0, rect.y0 + rect.height * 0.8),
                new_text,
                fontsize=font_size,
                color=(0, 0, 0),
                fontname="helv"
            )

        new_filename = f"revised_{file.filename}"
        new_path = os.path.join(UPLOAD_DIR, new_filename)
        doc.save(new_path, garbage=4, deflate=True, clean=True)
        doc.close()

        if os.path.exists(temp_path):
            os.remove(temp_path)

        return FileResponse(new_path, media_type="application/pdf", filename=new_filename)

    except Exception as e:
        if 'temp_path' in locals() and os.path.exists(temp_path):
            os.remove(temp_path)
        return JSONResponse({"error": str(e)}, status_code=500)
    
# ========================================
# DOWNLOAD/VIEW PDF ENDPOINT
# ========================================

@app.get("/api/sops/{sop_id}/download")
async def download_sop_pdf(
    sop_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Download/View PDF file"""
    try:
        sop = crud.get_sop_by_id(db, sop_id)
        
        if not sop:
            raise HTTPException(status_code=404, detail="SOP tidak ditemukan")
        
        print(f"📄 SOP: {sop.code}")
        print(f"📂 File URL: {sop.file_url}")
        
        if not sop.file_url:
            raise HTTPException(
                status_code=404, 
                detail="File PDF tidak tersedia. Silakan upload ulang SOP."
            )
        
        # Check if file exists
        possible_paths = [
            sop.file_url,
            os.path.join("uploaded_pdfs", os.path.basename(sop.file_url)),
            os.path.join("sop_files", os.path.basename(sop.file_url)),
        ]
        
        for path in possible_paths:
            print(f"   Checking: {path}")
            if os.path.exists(path):
                print(f"   ✅ Found!")
                return FileResponse(
                    path,
                    media_type="application/pdf",
                    headers={
                        "Content-Disposition": f'inline; filename="{sop.code}.pdf"'
                    }
                )
        
        raise HTTPException(
            status_code=404,
            detail=f"File tidak ditemukan: {sop.file_url}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
    
# ========================================
# REVISION ENDPOINTS
# ========================================

@app.get("/api/revisions", response_model=List[schemas.SOPRevisionResponse])
def get_all_revisions(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all SOP revisions with optional status filter"""
    if status:
        return crud.get_revisions_by_status(db, status)
    return crud.get_revisions(db, skip=skip, limit=limit)

@app.get("/api/revisions/sop/{sop_id}", response_model=List[schemas.SOPRevisionResponse])
def get_revisions_by_sop(
    sop_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all revisions for a specific SOP"""
    return crud.get_revisions_by_sop(db, sop_id)

@app.get("/api/revisions/{revision_id}", response_model=schemas.SOPRevisionResponse)
def get_revision(
    revision_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get revision by ID"""
    revision = crud.get_revision_by_id(db, revision_id)
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
    return revision

@app.post("/api/revisions", response_model=schemas.SOPRevisionResponse, status_code=201)
def create_revision(
    revision: schemas.SOPRevisionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "kepala_bagian", "ketua_tim"]))
):
    """Create new revision"""
    try:
        # Verify SOP exists
        sop = crud.get_sop_by_id(db, revision.sop_id)
        if not sop:
            raise HTTPException(status_code=404, detail="SOP not found")
        
        new_revision = crud.create_revision(db, revision, current_user.id)
        return new_revision
    except Exception as e:
        print(f"❌ Error creating revision: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/revisions/{revision_id}", response_model=schemas.SOPRevisionResponse)
def update_revision(
    revision_id: str,
    revision_update: schemas.SOPRevisionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "kepala_bagian", "ketua_tim"]))
):
    """Update revision"""
    updated = crud.update_revision(db, revision_id, revision_update, current_user.id)
    if not updated:
        raise HTTPException(status_code=404, detail="Revision not found")
    return updated

@app.put("/api/revisions/{revision_id}/approve")
def approve_revision(
    revision_id: str,
    request: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "kepala_bagian"]))
):
    """Approve revision"""
    try:
        review_notes = request.get("review_notes", "")
        
        approved = crud.approve_revision(db, revision_id, current_user.id, review_notes)
        if not approved:
            raise HTTPException(status_code=404, detail="Revision not found")
        
        return {
            "message": "Revision approved successfully",
            "revision": approved
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error approving revision: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/revisions/{revision_id}/reject")
def reject_revision(
    revision_id: str,
    request: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "kepala_bagian"]))
):
    """Reject revision"""
    try:
        reject_reason = request.get("reject_reason", "")
        
        if not reject_reason.strip():
            raise HTTPException(status_code=400, detail="Reject reason is required")
        
        rejected = crud.reject_revision(db, revision_id, current_user.id, reject_reason)
        if not rejected:
            raise HTTPException(status_code=404, detail="Revision not found")
        
        return {
            "message": "Revision rejected successfully",
            "revision": rejected
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error rejecting revision: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/revisions/{revision_id}")
def delete_revision(
    revision_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    """Delete revision"""
    success = crud.delete_revision(db, revision_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Revision not found")
    return {"message": "Revision deleted successfully"}

# ========================================
# USER ENDPOINTS
# ========================================

@app.get("/api/users", response_model=List[schemas.UserResponse])
def get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get all users"""
    users = db.query(models.User).all()
    return users

@app.get("/api/users/{user_id}", response_model=schemas.UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get user by ID"""
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ========================================
# APPROVAL ENDPOINTS
# ========================================

@app.put("/api/sops/{sop_id}/approve")
def approve_sop(
    sop_id: str,
    review_notes: str = "",
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "kepala_bagian"]))
):
    """Approve SOP"""
    try:
        sop = crud.get_sop_by_id(db, sop_id)
        
        if not sop:
            raise HTTPException(status_code=404, detail="SOP not found")
        
        # Update approval status
        sop.approval_status = "approved"
        sop.status = "aktif"  # ✅ Ubah status jadi active setelah approved
        sop.approved_by = current_user.id
        sop.approval_date = datetime.now()
        
        db.commit()
        db.refresh(sop)
        
        # Log activity
        crud.create_activity_log(
            db=db,
            user_id=current_user.id,
            sop_id=sop.id,
            action="approve",
            description=f"Approved SOP: {sop.title}"
        )
        
        return {"message": "SOP approved successfully", "sop": sop}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/sops/{sop_id}/reject")
def reject_sop(
    sop_id: str,
    rejection_data: dict,  # {rejection_reason: str}
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "kepala_bagian"]))
):
    """Reject SOP"""
    try:
        sop = crud.get_sop_by_id(db, sop_id)
        
        if not sop:
            raise HTTPException(status_code=404, detail="SOP not found")
        
        rejection_reason = rejection_data.get("rejection_reason", "")
        
        if not rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required")
        
        # Update approval status
        sop.approval_status = "rejected"
        sop.approved_by = current_user.id
        sop.approval_date = datetime.now()
        sop.rejection_reason = rejection_reason
        
        db.commit()
        db.refresh(sop)
        
        # Log activity
        crud.create_activity_log(
            db=db,
            user_id=current_user.id,
            sop_id=sop.id,
            action="reject",
            description=f"Rejected SOP: {sop.title} - Reason: {rejection_reason}"
        )
        
        return {"message": "SOP rejected", "sop": sop}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
# ========================================
# USER PROFILE ENDPOINTS
# ========================================

@app.get("/api/users/me")
def get_current_user_profile(
    current_user: models.User = Depends(get_current_user)
):
    """Get current user profile"""
    return current_user


@app.put("/api/users/me")
def update_current_user_profile(
    profile_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update current user profile"""
    try:
        # Update fields
        if "full_name" in profile_data:
            current_user.full_name = profile_data["full_name"]
        if "email" in profile_data:
            # Check if email already exists for other user
            existing_user = db.query(models.User).filter(
                models.User.email == profile_data["email"],
                models.User.id != current_user.id
            ).first()
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already in use")
            current_user.email = profile_data["email"]
        if "phone" in profile_data:
            current_user.phone = profile_data["phone"]
        
        db.commit()
        db.refresh(current_user)
        
        return {"message": "Profile updated successfully", "user": current_user}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/users/me/avatar")
def update_user_avatar(
    avatar_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update user avatar"""
    try:
        current_user.avatar_url = avatar_data.get("avatar_url", "")
        db.commit()
        db.refresh(current_user)
        
        return {"message": "Avatar updated successfully", "avatar_url": current_user.avatar_url}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/users/me/password")
def update_user_password(
    password_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Update user password"""
    try:
        current_password = password_data.get("current_password")
        new_password = password_data.get("new_password")
        
        if not current_password or not new_password:
            raise HTTPException(status_code=400, detail="Both passwords required")
        
        # Verify current password
        if not verify_password(current_password, current_user.password_hash):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Update password
        current_user.password_hash = get_password_hash(new_password)
        db.commit()
        
        return {"message": "Password updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ========================================
# AI GENERATE SOP
# ========================================

class SOPRequest(BaseModel):
    title: str

@app.post("/generate_sop")
def generate_sop(data: SOPRequest):
    """Generate AI description"""
    steps = [
        f"1. Menentukan kebutuhan {data.title}",
        f"2. Koordinasi tim terkait {data.title}",
        f"3. Pelaksanaan proses",
        f"4. Review hasil",
        f"5. Laporan akhir"
    ]
    return {"steps": "\n".join(steps)}


# ========================================
# ROOT ENDPOINT
# ========================================

@app.get("/")
def root():
    return {
        "message": "BPS SOP Management API with Database",
        "version": "2.0",
        "database": "PostgreSQL",
        "status": "Running",
        "endpoints": {
            "auth": "/api/auth/login",
            "sops": "/api/sops",
            "pdf_edit": "/edit-pdf/"
        }
    }
    
handler = Mangum(app)