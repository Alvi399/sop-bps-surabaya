from mangum import Mangum
import sys
import os

# Add backend to path
backend_path = os.path.join(os.path.dirname(__file__), 'backend')
sys.path.insert(0, backend_path)

# Import FastAPI app
from main import app

# Mangum handler - INI YANG VERCEL PANGGIL
handler = Mangum(app, lifespan="off")