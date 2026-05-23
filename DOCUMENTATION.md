# SOP BPS Surabaya - Sistem Manajemen SOP

Sistem Manajemen Standard Operating Procedure (SOP) untuk Badan Pusat Statistik (BPS) Surabaya. Aplikasi web berbasis React dan Python untuk mengelola, membuat, dan merevisi dokumen SOP secara digital.

## 🚀 Fitur Utama

### 👤 Manajemen Pengguna
- Sistem autentikasi dengan role-based access control
- 4 level akses: admin, kepala bagian, ketua tim, staf
- Login dengan email dan password
- Manajemen profil pengguna

### 📄 Manajemen SOP
- **Dashboard Utama**: Tampilan overview semua SOP
- **Manajemen SOP**: CRUD operasi untuk dokumen SOP
- **Pembuatan SOP Baru**: Form lengkap untuk membuat SOP baru
- **Edit SOP**: Edit metadata dan konten PDF
- **Revisi SOP**: Sistem tracking revisi dan persetujuan
- **Pengaturan**: Konfigurasi sistem

### 📄 Fitur Teknis
- **PDF Generation**: Generate PDF SOP otomatis dari template
- **File Upload**: Upload dan manage file PDF
- **Search Functionality**: Pencarian SOP berdasarkan kode/nama
- **Version Control**: Tracking versi dan revisi SOP
- **Activity Log**: Audit trail untuk semua aktivitas

## 🛠️ Teknologi

### Frontend
- **React 19.1.1** dengan TypeScript
- **Vite** sebagai build tool
- **Tailwind CSS** untuk styling
- **React Router DOM** untuk routing
- **React Hook Form** + **Zod** untuk form validation
- **TanStack Query** untuk state management
- **Radix UI** components
- **shadcn/ui** component library

### Backend
- **Python** dengan FastAPI
- **PostgreSQL** database
- **JWT** untuk autentikasi
- **PDFLib** untuk PDF generation
- **Supabase** untuk database management

### Development Tools
- **ESLint** untuk code linting
- **TypeScript** untuk type safety
- **Concurrently** untuk parallel development
- **Vercel** untuk deployment

## 📋 Instalasi

### Prasyarat
- Node.js 18+
- Python 3.8+
- PostgreSQL database
- Git

### Langkah Instalasi

1. **Clone Repository**
```bash
git clone https://github.com/marvinrimbawan/sop-bps-surabaya.git
cd sop-bps-surabaya
```

2. **Setup Backend**
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

3. **Setup Frontend**
```bash
cd shadcn-ui
npm install
cp .env.example .env
```

4. **Jalankan Aplikasi**
```bash
# Dari root directory
npm run dev
```

## 🌐 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/sop_bps_db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api
```

## 👥 Default Credentials

- **Email**: admin@bps-surabaya.go.id
- **Password**: bps123456

## 📁 Struktur Project

```
sop-bps-surabaya/
├── backend/                 # Python backend API
├── shadcn-ui/              # React frontend application
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # Reusable components
│   │   ├── lib/           # Utility functions and APIs
│   │   ├── types/         # TypeScript type definitions
│   │   └── hooks/         # Custom React hooks
├── node_modules/           # Node dependencies
├── public/                 # Static assets
└── README.md              # Project documentation
```

## 📊 Routes

### Autentikasi
- `/login` - Halaman login
- `/register` - Halaman registrasi

### Dashboard
- `/` - Dashboard utama

### Manajemen SOP
- `/management` - Manajemen SOP
- `/create` - Buat SOP baru
- `/edit/:id` - Edit SOP
- `/edit-pdf/:id` - Edit PDF langsung
- `/revision` - Halaman revisi

### Pengaturan
- `/settings` - Pengaturan sistem

## 🎯 Role-based Access Control

| Role | Akses |
|------|-------|
| admin | Full access |
| kepala_bagian | Edit SOP, approval |
| ketua_tim | View dan edit terbatas |
| staf | View only |

## 🔧 Development

### Available Scripts
```bash
# Jalankan development server
npm run dev

# Jalankan backend saja
npm run start:backend

# Jalankan frontend saja
npm run start:frontend

# Build untuk production
npm run build

# Linting
npm run lint
```

### Code Quality
- ESLint untuk code linting
- TypeScript untuk type safety
- Prettier untuk code formatting

## 🚀 Deployment

### Vercel Deployment
```bash
vercel --prod
```

### Manual Deployment
1. Build frontend: `npm run build`
2. Deploy ke hosting
3. Setup backend di server

## 📝 API Endpoints

### Auth
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

### SOP Management
- `GET /api/sops` - Get all SOPs
- `GET /api/sops/:id` - Get SOP by ID
- `POST /api/sops` - Create new SOP
- `PUT /api/sops/:id` - Update SOP
- `DELETE /api/sops/:id` - Delete SOP
- `GET /api/sops/search/:query` - Search SOPs

## 🔄 Version History

### v1.0.0
- Initial release
- Basic SOP management
- User authentication
- PDF generation
- Search functionality

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

## 📄 License

Proyek ini dilisensikan di bawah MIT License.

## 📞 Support

Untuk bantuan dan support, silakan hubungi:
- Email: admin@bps-surabaya.go.id
- GitHub Issues: https://github.com/marvinrimbawan/sop-bps-surabaya/issues

---

**Dikembangkan untuk BPS Surabaya**
**Tahun Akademik 2025**
**Bahasa Indonesia**

*Dibuat dengan ❤️ menggunakan React, Python, dan teknologi modern lainnya.*