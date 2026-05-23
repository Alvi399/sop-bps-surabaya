login admin

email : admin@bps-surabaya.go.id
pw : bps123456

1. Clone Repository
git clone https://github.com/marvinrimbawan/sop-bps-surabaya.git
cd sop-bps-surabaya

2. Setup Backend
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

Backend .env file:
DATABASE_URL=postgresql://user:password@localhost:5432/sop_bps_db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

Initialize Database:
python init_db.py
Run Backend Server:
hpython run.py/uvicorn main:app --reload

3. Setup Frontend
cd shadcn-ui
npm install
cp .env.example .env

Frontend .env file:
envVITE_API_URL=http://localhost:8000/api

Run Frontend Development Server:
npm run dev
