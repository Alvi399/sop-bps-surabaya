import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthService } from "@/lib/auth";
import { SOPDocument } from "@/types";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  Plus, 
  Copy,
  Clock,        // ✅ TAMBAH
  CheckCircle,  // ✅ TAMBAH
  XCircle       // ✅ TAMBAH
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API_URL = "http://localhost:8000/api";

// Format tanggal sederhana
const formatDate = (dateString: string) => {
  if (!dateString) return "Tanggal tidak tersedia";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Tanggal tidak valid";
  
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ];
  const day = date.getDate().toString().padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

export default function Management() {
  const [sopDocuments, setSOPDocuments] = useState<SOPDocument[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<SOPDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");

  const currentUser = AuthService.getCurrentUser();
  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "kepala_bagian";

  const location = useLocation();
  const navigate = useNavigate();

  // ✅ TAMBAH: Helper function untuk check approval status
  const isPendingApproval = (sop: SOPDocument) => {
    return sop.status === 'draft' || sop.approvalStatus === 'pending';
  };

  // Fetch SOPs from API
  useEffect(() => {
    fetchSOPs();
  }, []);

  const fetchSOPs = async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        window.location.href = "/login";
        return;
      }

      const response = await axios.get(`${API_URL}/sops`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Transform data dari backend ke format frontend
      const transformedData: SOPDocument[] = response.data.map((item: any) => ({
        id: item.id,
        code: item.code,
        title: item.title,
        description: item.description || "",
        department: item.department,
        responsiblePerson: item.responsible_person,
        status: item.status,
        approvalStatus: item.approval_status || 'pending', // ✅ TAMBAH field ini
        effectiveDate: item.effective_date,
        expiryDate: item.expiry_date,
        version: item.version,
        fileUrl: item.file_url,
        createdBy: item.created_by,
        approvedBy: item.approved_by,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));

      setSOPDocuments(transformedData);
      setFilteredDocuments(transformedData);
      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching SOPs:", error);
      
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        AuthService.logout();
        window.location.href = "/login";
      } else {
        toast.error("Failed to load SOP data");
      }
      
      setLoading(false);
    }
  };

  // Ambil query dari URL (jika ada)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchFromURL = params.get("search");
    if (searchFromURL) setSearchTerm(searchFromURL);
  }, [location.search]);

  // Filter dokumen sesuai input
  useEffect(() => {
    let filtered = sopDocuments;

    if (searchTerm) {
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.responsiblePerson
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((doc) => doc.status === statusFilter);
    }

    if (departmentFilter !== "all") {
      filtered = filtered.filter((doc) => doc.department === departmentFilter);
    }

    setFilteredDocuments(filtered);
  }, [searchTerm, statusFilter, departmentFilter, sopDocuments]);

  const handleApprove = async (sopId: string) => {
    if (!confirm("Apakah Anda yakin menyetujui SOP ini?")) return;
    
    try {
      const token = AuthService.getToken();
      await axios.put(`${API_URL}/sops/${sopId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success("SOP berhasil disetujui!");
      fetchSOPs();
    } catch (error) {
      toast.error("Gagal menyetujui SOP");
    }
  };

  const handleReject = async (sopId: string) => {
    const reason = prompt("Alasan penolakan:");
    if (!reason) return;
    
    try {
      const token = AuthService.getToken();
      await axios.put(`${API_URL}/sops/${sopId}/reject`, 
        { rejection_reason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.error("SOP ditolak");
      fetchSOPs();
    } catch (error) {
      toast.error("Gagal menolak SOP");
    }
  };

  /* =======================
     HANDLER AKSI TOMBOL
  ======================= */
  const handleView = async (sopId: string, sopCode: string) => {
    try {
      const token = AuthService.getToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        window.location.href = "/login";
        return;
      }

      toast.info("Membuka PDF...");

      const response = await fetch(`${API_URL}/sops/${sopId}/download`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Session expired. Please login again.");
          AuthService.logout();
          window.location.href = "/login";
          return;
        }
        if (response.status === 404) {
          toast.error("File PDF tidak ditemukan");
          return;
        }
        throw new Error("Gagal mengambil file PDF");
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

    } catch (error: any) {
      console.error("Error viewing PDF:", error);
      toast.error(`Gagal membuka PDF: ${error.message}`);
    }
  };

  const handleDownload = async (sopId: string, sopCode: string) => {
    try {
      const token = AuthService.getToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        window.location.href = "/login";
        return;
      }

      toast.info("Mengunduh PDF...");

      const response = await fetch(`${API_URL}/sops/${sopId}/download`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error("Session expired. Please login again.");
          AuthService.logout();
          window.location.href = "/login";
          return;
        }
        if (response.status === 404) {
          toast.error("File PDF tidak ditemukan");
          return;
        }
        throw new Error("Gagal mengunduh file PDF");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sopCode || 'SOP'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("PDF berhasil diunduh!");

    } catch (error: any) {
      console.error("Error downloading PDF:", error);
      toast.error(`Gagal mengunduh PDF: ${error.message}`);
    }
  };

  const handleEdit = (id: string) => {
    if (!isAdmin) {
      toast.error("Anda tidak memiliki akses untuk mengedit SOP");
      return;
    }
    navigate(`/edit/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (currentUser?.role !== "admin") {
      toast.error("Hanya Admin yang dapat menghapus SOP");
      return;
    }

    if (!confirm("Apakah Anda yakin ingin menghapus SOP ini?")) return;

    try {
      const token = AuthService.getToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        window.location.href = "/login";
        return;
      }

      await axios.delete(`${API_URL}/sops/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("SOP berhasil dihapus");
      fetchSOPs();
    } catch (error: any) {
      console.error("Error deleting SOP:", error);
      
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        AuthService.logout();
        window.location.href = "/login";
      } else if (error.response?.status === 403) {
        toast.error("You don't have permission to delete this SOP");
      } else {
        toast.error("Failed to delete SOP");
      }
    }
  };

  const handleDuplicate = async (sop: SOPDocument) => {
    const defaultYear = new Date().getFullYear() + 1;
    const newYear = prompt("Masukkan tahun baru untuk duplikasi (YYYY):", String(defaultYear));
    if (!newYear) return;

    if (!/^\d{4}$/.test(newYear)) {
      toast.error("Format tahun tidak valid. Gunakan format YYYY (contoh: 2026).");
      return;
    }

    try {
      const token = AuthService.getToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        window.location.href = "/login";
        return;
      }

      const duplicatedData = {
        code: sop.code ? sop.code.replace(/\d{4}/g, newYear) : sop.code,
        title: sop.title ? sop.title.replace(/\d{4}/g, newYear) : sop.title,
        description: sop.description ? sop.description.replace(/\d{4}/g, newYear) : sop.description,
        department: sop.department,
        responsible_person: sop.responsiblePerson,
        status: "draft",
        effective_date: sop.effectiveDate ? sop.effectiveDate.replace(/^\d{4}/, newYear) : sop.effectiveDate,
        expiry_date: sop.expiryDate ? sop.expiryDate.replace(/^\d{4}/, newYear) : sop.expiryDate,
        file_url: sop.fileUrl,
      };

      await axios.post(`${API_URL}/sops`, duplicatedData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      toast.success(`SOP berhasil diduplikasi sebagai draft untuk tahun ${newYear}`);
      fetchSOPs();
    } catch (error: any) {
      console.error("Error duplicating SOP:", error);
      
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        AuthService.logout();
        window.location.href = "/login";
      } else if (error.response?.status === 400) {
        toast.error("SOP code already exists");
      } else {
        toast.error("Failed to duplicate SOP");
      }
    }
  };

  /* =======================
     STATUS BADGE
  ======================= */
  const getStatusBadge = (status: string) => {
    const variants = {
      active: "default" as const,     // ✅ Ubah dari "aktif" ke "active"
      draft: "outline" as const,
      archived: "destructive" as const,
      revisi: "secondary" as const,
      kedaluwarsa: "destructive" as const,
    };

    const labels = {
      active: "Aktif",               // ✅ Ubah label
      draft: "Draft",
      archived: "Archived",
      revisi: "Perlu Revisi",
      kedaluwarsa: "Kedaluwarsa",
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  // ✅ TAMBAH: Function untuk approval status badge
  const getApprovalBadge = (sop: SOPDocument) => {
    if (isPendingApproval(sop)) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 flex items-center gap-1 w-fit">
          <Clock className="h-3 w-3" />
          Menunggu Approval
        </Badge>
      );
    }

    if (sop.approvalStatus === 'approved') {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 flex items-center gap-1 w-fit">
          <CheckCircle className="h-3 w-3" />
          Approved
        </Badge>
      );
    }

    if (sop.approvalStatus === 'rejected') {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200 flex items-center gap-1 w-fit">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    }

    return null;
  };

  const departments = Array.from(
    new Set(sopDocuments.map((doc) => doc.department).filter(Boolean))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading SOP data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex overflow-hidden">
      {/* Background animasi */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-24 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.5))]" />
      </div>

      <aside className="fixed left-0 top-0 h-full w-64 z-30">
        <Sidebar activeMenu="management" />
      </aside>

      <div className="ml-64 flex-1 flex flex-col relative z-10">
        <Header />

        <main className="flex-1 overflow-y-auto scroll-smooth p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Manajemen SOP
            </h1>
            <p className="text-gray-600">Kelola dokumen Standard Operating Procedure</p>
          </div>

          <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-2xl">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-xl">Daftar SOP</CardTitle>

                {isAdmin && (
                  <Button
                    onClick={() => navigate("/create")}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah SOP Baru
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Cari SOP berdasarkan judul, kode, atau penanggung jawab..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/60 border-gray-200 focus:bg-white transition-all"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48 bg-white/60 border-gray-200">
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>  
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={departmentFilter}
                  onValueChange={setDepartmentFilter}
                >
                  <SelectTrigger className="w-full sm:w-56 bg-white/60 border-gray-200">
                    <SelectValue placeholder="Filter Tim" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tim</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-white/50 backdrop-blur-sm">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-blue-50 to-purple-50">
                      <TableHead>Kode SOP</TableHead>
                      <TableHead>Judul</TableHead>
                      <TableHead>Tim</TableHead>
                      <TableHead>Penanggung Jawab</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approval</TableHead> {/* ✅ TAMBAH kolom baru */}
                      <TableHead>Tanggal Berlaku</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          Tidak ada data SOP yang ditemukan
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDocuments.map((doc) => (
                        <TableRow key={doc.id} className="hover:bg-white/60 transition-colors">
                          <TableCell className="font-mono text-sm">{doc.code}</TableCell>
                          <TableCell>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {doc.description}
                            </p>
                          </TableCell>
                          <TableCell>{doc.department}</TableCell>
                          <TableCell>{doc.responsiblePerson}</TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          <TableCell>{getApprovalBadge(doc)}</TableCell> {/* ✅ TAMBAH approval badge */}
                          <TableCell>{formatDate(doc.effectiveDate)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {/* ✅ TAMBAH disabled prop ke semua button */}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                disabled={isPendingApproval(doc)}  // ✅ Disable saat pending
                                onClick={() => handleView(doc.id, doc.code)}
                                title={isPendingApproval(doc) ? "Menunggu approval" : "Lihat SOP"}
                                className={isPendingApproval(doc) ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {isAdmin && isPendingApproval(doc) && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 border-green-600"
                                    onClick={() => handleApprove(doc.id)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-600"
                                    onClick={() => handleReject(doc.id)}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              {isAdmin && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isPendingApproval(doc)}  // ✅ Disable saat pending
                                    onClick={() => handleEdit(doc.id)}
                                    title={isPendingApproval(doc) ? "Menunggu approval" : "Edit Data SOP"}
                                    className={isPendingApproval(doc) ? "opacity-50 cursor-not-allowed" : ""}
                                  >
                                    <Edit className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    disabled={isPendingApproval(doc)}  // ✅ Disable saat pending
                                    onClick={() => handleDuplicate(doc)}
                                    title={isPendingApproval(doc) ? "Menunggu approval" : "Duplikat SOP"}
                                    className={isPendingApproval(doc) ? "opacity-50 cursor-not-allowed" : ""}
                                  >
                                    <Copy className="h-4 w-4 text-green-600" />
                                  </Button>
                                </>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isPendingApproval(doc)}  // ✅ Disable saat pending
                                onClick={() => handleDownload(doc.id, doc.code)}
                                title={isPendingApproval(doc) ? "Menunggu approval" : "Download SOP"}
                                className={isPendingApproval(doc) ? "opacity-50 cursor-not-allowed" : ""}
                              >
                                <Download className="h-4 w-4" />
                              </Button>

                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isPendingApproval(doc)}
                                  onClick={() => handleDelete(doc.id)}
                                  title={isPendingApproval(doc) ? "Menunggu approval" : "Hapus SOP"}
                                  className={`text-red-600 ${isPendingApproval(doc) ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 text-sm text-gray-600 flex justify-between items-center">
                <span>
                  Menampilkan {filteredDocuments.length} dari{" "}
                  {sopDocuments.length} SOP
                </span>
              </div>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </div>
  );
}