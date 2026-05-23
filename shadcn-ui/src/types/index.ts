  // ================================
  // 🧩 TYPES UTAMA UNTUK SISTEM SOP
  // ================================

  // 👤 User
  export interface User {
    id: string;
    email: string;
    fullName: string;  // Frontend uses camelCase
    full_name?: string; // Backend uses snake_case
    role: "admin" | "kepala_bagian" | "ketua_tim" | "staf";
    department: string;
    phone?: string;
    avatarUrl?: string;
    avatar_url?: string; // Backend uses snake_case
    isActive?: boolean;
    is_active?: boolean;
    createdAt?: string;
    created_at?: string;
    joinDate?: string;
    join_date?: string;
    lastLogin?: string;
    last_login?: string;
    password?: string;
  }

  // 📄 Dokumen SOP
  export interface SOPDocument {
    id: string;
    code: string; // Kode unik SOP
    title: string; // Judul SOP
    description: string; // Deskripsi / langkah-langkah
    department: string; // Tim / bagian yang bertanggung jawab
    responsiblePerson: string; // Penanggung jawab utama
    status: string; // Status dokumen
    approvalStatus?: string;
    effectiveDate: string; // Tanggal berlaku
    expiryDate: string; // Tanggal kedaluwarsa
    version: number; // Versi SOP
    fileUrl: string; // Path / URL file PDF SOP (bisa lokal)
    createdBy: string; // ID user pembuat
    createdAt: string; // Tanggal dibuat
    updatedAt?: string; // Tanggal diperbarui (opsional)
    updatedBy?: string; // ID user terakhir mengedit
    approvedBy?: string; // ID user yang menyetujui (opsional)
  }

  // 🔁 Revisi SOP
  export interface SOPRevision {
    id: string;
    sopId: string;
    version: number;
    title: string;
    description: string;
    changesDescription: string;
    fileUrl?: string; // file hasil revisi
    status: "menunggu_persetujuan" | "disetujui" | "ditolak";
    revisedBy: string; // siapa yang revisi
    reviewedBy?: string; // siapa yang review
    revisionDate: string;
    approvalDate?: string;
    reviewNotes?: string;
  }

  // 🕒 Log aktivitas (untuk histori dan audit trail)
  export interface ActivityLog {
    id: string;
    userId: string;
    sopId?: string;
    action: "create" | "update" | "approve" | "expire" | "delete" | "draft"; // semua aksi yang dicatat
    description: string;
    createdAt: string;
  }

  // 🔐 Status autentikasi global (state user yang login)
  export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
  }

  export const transformUser = (user: any): User => ({
  id: user.id,
  email: user.email,
  fullName: user.full_name || user.fullName,
  role: user.role,
  department: user.department,
  phone: user.phone,
  avatarUrl: user.avatar_url || user.avatarUrl,
  isActive: user.is_active ?? user.isActive,
  createdAt: user.created_at || user.createdAt,
  joinDate: user.join_date || user.joinDate,
  lastLogin: user.last_login || user.lastLogin,
});
