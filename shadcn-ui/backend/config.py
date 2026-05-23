from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = os.getenv(
        'DATABASE_URL',
        'mysql+pymysql://root:password@localhost/sop_bps'
    )
    
    # API
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "SOP BPS Surabaya"
    
    # Security
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS - Update untuk Vercel
    BACKEND_CORS_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://sop-bps-surabaya.vercel.app",
        "https://*.vercel.app"
    ]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Fix MySQL URL format jika menggunakan format lama "mysql://"
if settings.DATABASE_URL and settings.DATABASE_URL.startswith("mysql://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)

# Fix PostgreSQL URL format (backward compatibility)
if settings.DATABASE_URL and settings.DATABASE_URL.startswith("postgres://"):
    settings.DATABASE_URL = settings.DATABASE_URL.replace("postgres://", "postgresql://", 1)