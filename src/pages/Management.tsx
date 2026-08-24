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
import { mockSOPDocuments } from "@/lib/mockData";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  Plus, 
  Copy,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  FileCheck
} from "lucide-react";
import { RevisionSection } from "./Revision";
import { useRealtimeSubscription, notifyRealtimeUpdate } from "@/lib/realtime";
import { toast } from "sonner";
import axios from "axios";

const API_URL = "/api";

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

  // Dialog States for Approve & Reject
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedSOP, setSelectedSOP] = useState<SOPDocument | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const currentUser = AuthService.getCurrentUser();
  const isAdmin =
    currentUser?.role === "admin" || currentUser?.role === "kepala_bagian";
  const canApprove =
    currentUser && ["admin", "kepala_bagian", "ketua_tim"].includes(currentUser.role);
  const isAuthorizedForRevision =
    currentUser && ["admin", "kepala_bagian", "ketua_tim"].includes(currentUser.role);

  const location = useLocation();
  const navigate = useNavigate();

  // ✅ Helper function untuk check approval status
  const isPendingApproval = (sop: SOPDocument) => {
    return sop.status === 'draft' || sop.approvalStatus === 'pending' || !sop.approvalStatus || sop.approvalStatus === 'draft';
  };

  const fetchSOPs = async (isBackground = false) => {
    try {
      if (!isBackground) {
        setLoading(true);
      }
      const token = AuthService.getToken();
      
      if (!token) {
        if (!isBackground) {
          toast.error("Session expired. Please login again.");
          window.location.href = "/login";
        }
        return;
      }

      const response = await axios.get(`${API_URL}/sops`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle Static Hosting Fallback for API
      if (typeof response.data === 'string' && response.data.includes('<html')) {
        throw new Error('STATIC_HOSTING_FALLBACK');
      }

      // Transform data dari backend ke format frontend
      const transformedData: SOPDocument[] = Array.isArray(response.data) ? response.data.map((item: any) => ({
        id: item.id,
        code: item.code,
        title: item.title,
        description: item.description || "",
        department: item.department,
        responsiblePerson: item.responsible_person,
        status: item.status,
        approvalStatus: item.approval_status || 'pending',
        effectiveDate: item.effective_date,
        expiryDate: item.expiry_date,
        version: item.version,
        fileUrl: item.file_url,
        createdBy: item.created_by,
        approvedBy: item.approved_by,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })) : [];

      setSOPDocuments(transformedData);
      setFilteredDocuments(transformedData);
      if (!isBackground) {
        setLoading(false);
      }
    } catch (error: any) {
      console.warn("Error fetching SOPs, falling back to mock data", error);
      
      const isStatic = error.message === 'STATIC_HOSTING_FALLBACK' || error.response?.status === 404;
      
      if (isStatic) {
        setSOPDocuments(mockSOPDocuments);
        setFilteredDocuments(mockSOPDocuments);
      } else if (error.response?.status === 401) {
        if (!isBackground) {
          toast.error("Session expired. Please login again.");
          AuthService.logout();
          window.location.href = "/login";
        }
      } else if (!isBackground) {
        toast.error("Failed to load SOP data");
      }
      
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  // Fetch SOPs from API
  useEffect(() => {
    fetchSOPs(false);
  }, []);

  useRealtimeSubscription(() => fetchSOPs(true), 3000);

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

  const handleOpenApproveDialog = (sop: SOPDocument) => {
    setSelectedSOP(sop);
    setApproveDialogOpen(true);
  };

  const handleOpenRejectDialog = (sop: SOPDocument) => {
    setSelectedSOP(sop);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const submitApprove = async () => {
    if (!selectedSOP) return;
    
    try {
      setActionLoading(true);
      const token = AuthService.getToken();
      await axios.put(`${API_URL}/sops/${selectedSOP.id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success(`✅ SOP "${selectedSOP.title}" berhasil disetujui!`);
      setApproveDialogOpen(false);
      notifyRealtimeUpdate("sop_approved");
      await fetchSOPs(true);
    } catch (error: any) {
      console.error("Error approving SOP:", error);
      toast.error(error.response?.data?.detail || "Gagal menyetujui SOP");
    } finally {
      setActionLoading(false);
    }
  };

  const submitReject = async () => {
    if (!selectedSOP) return;
    if (!rejectionReason.trim()) {
      toast.error("Silakan masukkan alasan penolakan!");
      return;
    }
    
    try {
      setActionLoading(true);
      const token = AuthService.getToken();
      await axios.put(
        `${API_URL}/sops/${selectedSOP.id}/reject`, 
        { rejection_reason: rejectionReason.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`SOP "${selectedSOP.title}" telah ditolak.`);
      setRejectDialogOpen(false);
      notifyRealtimeUpdate("sop_rejected");
      await fetchSOPs(true);
    } catch (error: any) {
      console.error("Error rejecting SOP:", error);
      toast.error(error.response?.data?.detail || "Gagal menolak SOP");
    } finally {
      setActionLoading(false);
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
    navigate(`/edit/${id}`);
  };

  const handleDelete = async (id: string) => {
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
      notifyRealtimeUpdate("sop_deleted");
      fetchSOPs(true);
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
      notifyRealtimeUpdate("sop_duplicated");
      fetchSOPs(true);
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
      aktif: "default" as const,      // nilai dari backend: 'aktif'
      draft: "outline" as const,
      archived: "destructive" as const,
      revisi: "secondary" as const,
      kedaluwarsa: "destructive" as const,
    };

    const labels = {
      aktif: "Aktif",
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

  const sopCard = (
    <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-2xl">
      <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="text-xl">Daftar SOP</CardTitle>

                {/* Semua role bisa tambah SOP */}
                <Button
                  onClick={() => navigate("/create")}
                  className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Tambah SOP Baru
                </Button>
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
                        <TableRow
                          key={doc.id}
                          className={`hover:bg-white/60 transition-colors ${
                            doc.approvalStatus === 'rejected'
                              ? 'bg-red-50/60 border-l-4 border-l-red-400'
                              : doc.approvalStatus === 'pending'
                              ? 'bg-amber-50/40'
                              : ''
                          }`}
                        >
                          <TableCell className="font-mono text-sm">{doc.code}</TableCell>
                          <TableCell>
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-sm text-gray-500 truncate max-w-xs">
                              {doc.description}
                            </p>
                            {doc.approvalStatus === 'rejected' && (
                              <p className="text-xs text-red-600 font-semibold mt-1 flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> Ditolak — Staff perlu melakukan revisi
                              </p>
                            )}
                          </TableCell>
                          <TableCell>{doc.department}</TableCell>
                          <TableCell>{doc.responsiblePerson}</TableCell>
                          <TableCell>{getStatusBadge(doc.status)}</TableCell>
                          <TableCell>{getApprovalBadge(doc)}</TableCell>
                          <TableCell>{formatDate(doc.effectiveDate)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleView(doc.id, doc.code)}
                                title="Lihat SOP"
                                className="hover:bg-blue-50 text-gray-700 hover:text-blue-600"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {canApprove && isPendingApproval(doc) && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 border-green-600 hover:bg-green-50 dark:hover:bg-green-950/40"
                                    onClick={() => handleOpenApproveDialog(doc)}
                                    title="Setujui (Approve) SOP"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                                    onClick={() => handleOpenRejectDialog(doc)}
                                    title="Tolak (Reject) SOP"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </>
                              )}

                              {/* Edit: semua bisa edit, kecuali SOP pending yang bukan milik sendiri */}
                              {(isAdmin || doc.createdBy === currentUser?.id || !doc.createdBy) && doc.approvalStatus !== 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(doc.id)}
                                  title={doc.approvalStatus === 'rejected' ? 'Revisi & Ajukan Ulang SOP' : 'Edit Data SOP'}
                                  className={`hover:bg-blue-50 ${
                                    doc.approvalStatus === 'rejected'
                                      ? 'text-orange-600 hover:text-orange-700'
                                      : 'text-blue-600'
                                  }`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Duplikat: semua role */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDuplicate(doc)}
                                title="Duplikat SOP"
                                className="hover:bg-green-50 text-green-600"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(doc.id, doc.code)}
                                title="Download PDF SOP"
                                className="hover:bg-gray-100 text-gray-700"
                              >
                                <Download className="h-4 w-4" />
                              </Button>

                              {/* Hapus: hanya owner atau admin */}
                              {(isAdmin || (doc.createdBy === currentUser?.id || !doc.createdBy)) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(doc.id)}
                                  title="Hapus SOP"
                                  className="hover:bg-red-50 text-red-600"
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
  );

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
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

      <div className="ml-64 flex-1 min-w-0 flex flex-col relative z-10">
        <Header />

        <main className="flex-1 overflow-y-auto scroll-smooth p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              {isAuthorizedForRevision ? "Manajemen SOP & Riwayat Revisi" : "Manajemen SOP"}
            </h1>
            <p className="text-gray-600">
              {isAuthorizedForRevision
                ? "Kelola dokumen Standard Operating Procedure dan riwayat revisi"
                : "Daftar dokumen Standard Operating Procedure BPS Kota Surabaya"}
            </p>
          </div>

          <div className="space-y-8">
            {sopCard}

            {isAuthorizedForRevision && (
              <div className="pt-2">
                <RevisionSection />
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>

      {/* Modal Dialog Approve */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Konfirmasi Persetujuan SOP
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 text-sm">
              Apakah Anda yakin ingin menyetujui dan mempublikasikan dokumen SOP berikut?
            </DialogDescription>
          </DialogHeader>
          {selectedSOP && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-2">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {selectedSOP.title}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Kode: {selectedSOP.code}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Seksi/Tim: {selectedSOP.department}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setApproveDialogOpen(false)}
              disabled={actionLoading}
              className="dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Batal
            </Button>
            <Button
              onClick={submitApprove}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Setujui SOP
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Dialog Reject */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              Tolak Dokumen SOP
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 text-sm">
              Berikan alasan penolakan agar pembuat SOP dapat melakukan perbaikan.
            </DialogDescription>
          </DialogHeader>
          {selectedSOP && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {selectedSOP.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {selectedSOP.code}
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Alasan Penolakan *
                </label>
                <Textarea
                  placeholder="Jelaskan alasan penolakan atau bagian yang perlu direvisi..."
                  rows={4}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={actionLoading}
              className="dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Batal
            </Button>
            <Button
              onClick={submitReject}
              disabled={actionLoading || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Tolak SOP
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}