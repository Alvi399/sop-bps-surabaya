from fastapi import FastAPI, UploadFile, Form, Depends, HTTPException, status
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import fitz  # PyMuPDF
import os
import uuid
import graphviz
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet

# ✅ ABSOLUTE IMPORTS (tidak pakai titik)
from database import engine, get_db, Base
from config import settings
import models
import schemas
import crud
from auth import (
    verify_password, 
    create_access_token, 
    get_current_user,
    require_role
)

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="BPS SOP Management API", version="2.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Folders
UPLOAD_DIR = "sop_files"
os.makedirs(UPLOAD_DIR, exist_ok=True)


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
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login user"""
    user = crud.get_user_by_email(db, credentials.email)
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    crud.update_user_last_login(db, user.id)
    
    access_token = create_access_token(
        data={"id": user.id, "email": user.email, "role": user.role}
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "department": user.department
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
    sop = crud.get_sop_by_id(db, sop_id)
    if not sop:
        raise HTTPException(status_code=404, detail="SOP not found")
    return sop


@app.post("/api/sops", status_code=201)
def create_sop_endpoint(
    sop: schemas.SOPCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin", "kepala_bagian"]))
):
    """Create new SOP"""
    existing = crud.get_sop_by_code(db, sop.code)
    if existing:
        raise HTTPException(status_code=400, detail="SOP code already exists")
    
    return crud.create_sop(db, sop, current_user.id)


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
    return updated


@app.delete("/api/sops/{sop_id}")
def delete_sop_endpoint(
    sop_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["admin"]))
):
    """Delete SOP"""
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