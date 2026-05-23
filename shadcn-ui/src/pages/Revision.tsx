import { useState, useEffect } from 'react';
import { AuthService } from '@/lib/auth';
import { SOPRevision, SOPDocument, User } from '@/types';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, Download, CheckCircle, XCircle, Clock, History, TrendingUp, Users, FileText, Upload, AlertTriangle, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import axios from "axios";

const API_URL = "http://localhost:8000/api";

const getAuthToken = () => {
  const authData = localStorage.getItem('bps_sop_auth');
  if (!authData) return null;
  const user = JSON.parse(authData);
  return user.token || null;
};

export default function Revision() {
  // ===== STATE MANAGEMENT =====
  const [revisions, setRevisions] = useState<SOPRevision[]>([]);
  const [sopDocuments, setSOPDocuments] = useState<SOPDocument[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  
  // Dialog states
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  
  const [selectedRevision, setSelectedRevision] = useState<SOPRevision | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [editData, setEditData] = useState({
    version: '', // tetap string untuk input form
    changesDescription: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // ===== USE EFFECT =====
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      // ✅ Fetch revisions dari backend
      const revisionsResponse = await axios.get(`${API_URL}/revisions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Transform data dari backend ke format frontend
      const transformedRevisions = revisionsResponse.data.map((item: any) => ({
        id: item.id,
        sopId: item.sop_id,
        title: item.title,
        version: item.version,
        changesDescription: item.changes_description,
        status: item.status,
        revisedBy: item.revised_by,
        reviewedBy: item.reviewed_by,
        revisionDate: item.revision_date,
        approvalDate: item.approval_date,
        reviewNotes: item.review_notes,
      }));
      
      setRevisions(transformedRevisions);
      
      // ✅ Fetch SOP documents dari backend
      const sopResponse = await axios.get(`${API_URL}/sops`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Transform data
      const transformedSOPs = sopResponse.data.map((item: any) => ({
        id: item.id,
        code: item.code,
        title: item.title,
        description: item.description || "",
        department: item.department,
        responsiblePerson: item.responsible_person,
        status: item.status,
        effectiveDate: item.effective_date,
        expiryDate: item.expiry_date,
        version: item.version,
        fileUrl: item.file_url,
        createdBy: item.created_by,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      }));
      
      setSOPDocuments(transformedSOPs);
      
      // ✅ TAMBAH INI: Fetch users dari backend
      const usersResponse = await axios.get(`${API_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      // Transform users data
      const transformedUsers = usersResponse.data.map((item: any) => ({
        id: item.id,
        email: item.email,
        fullName: item.full_name,
        role: item.role,
        department: item.department,
        phone: item.phone,
        avatarUrl: item.avatar_url,
        isActive: item.is_active,
        joinDate: item.join_date,
        lastLogin: item.last_login,
        createdAt: item.created_at,
      }));
      
      setUsers(transformedUsers);
      setCurrentUser(AuthService.getCurrentUser());
      
    } catch (error: any) {
      console.error("Error fetching data:", error);
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        AuthService.logout();
      } else {
        toast.error("Gagal memuat data");
      }
    }
  };

  // ===== PERMISSION CONTROL =====
  const canManageRevisions = () => {
    if (!currentUser) return false;
    return ['admin', 'kepala_bagian', 'ketua_tim'].includes(currentUser.role); // ✅ Ganti 'kepala' → 'kepala_bagian'
  };

  // ===== HELPER FUNCTIONS =====
  const getSOPTitle = (sopId: string) => {
    const sop = sopDocuments.find(doc => doc.id === sopId);
    return sop ? sop.title : 'Unknown SOP';
  };

  const getSOPDocument = (sopId: string) => {
    return sopDocuments.find(doc => doc.id === sopId);
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.fullName : 'Unknown User';
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      menunggu_persetujuan: { 
        variant: 'secondary' as const, 
        icon: Clock, 
        label: 'Menunggu Persetujuan', 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200' 
      },
      disetujui: { 
        variant: 'default' as const, 
        icon: CheckCircle, 
        label: 'Disetujui', 
        color: 'bg-green-100 text-green-800 border-green-200' 
      },
      ditolak: { 
        variant: 'destructive' as const, 
        icon: XCircle, 
        label: 'Ditolak', 
        color: 'bg-red-100 text-red-800 border-red-200' 
      }
    };

    const config = variants[status as keyof typeof variants];
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} flex items-center gap-1 w-fit border`}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  // ===== HANDLER FUNCTIONS =====
  
  const handleViewRevision = (revision: SOPRevision) => {
    setSelectedRevision(revision);
    setViewDialogOpen(true);
  };

  const handleApproveRevision = (revision: SOPRevision) => {
    if (!canManageRevisions()) {
      toast.error('Anda tidak memiliki izin untuk menyetujui revisi!');
      return;
    }
    setSelectedRevision(revision);
    setReviewNotes('');
    setApproveDialogOpen(true);
  };

  const handleRejectRevision = (revision: SOPRevision) => {
    if (!canManageRevisions()) {
      toast.error('Anda tidak memiliki izin untuk menolak revisi!');
      return;
    }
    setSelectedRevision(revision);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleEditRevision = (revision: SOPRevision) => {
    if (!canManageRevisions()) {
      toast.error('Anda tidak memiliki izin untuk mengedit revisi!');
      return;
    }
    setSelectedRevision(revision);
    setEditData({
      version: revision.version.toString(), // ✅ number → string
      changesDescription: revision.changesDescription,
    });
    setEditDialogOpen(true);
  };

  const handleUploadNewVersion = (revision: SOPRevision) => {
    if (!canManageRevisions()) {
      toast.error('Anda tidak memiliki izin untuk upload dokumen!');
      return;
    }
    setSelectedRevision(revision);
    setUploadFile(null);
    setUploadDialogOpen(true);
  };

  const handleDownloadRevision = (revision: SOPRevision) => {
    const sop = getSOPDocument(revision.sopId);
    if (sop && sop.fileUrl) {
      const link = document.createElement('a');
      link.href = sop.fileUrl;
      link.download = `${sop.code}_v${revision.version}.pdf`;
      link.click();
      toast.success('✅ Download dimulai!');
    } else {
      toast.error('❌ File tidak tersedia!');
    }
  };

  // ===== SUBMIT FUNCTIONS =====
  const submitApproval = async () => {
    if (!selectedRevision || !currentUser) return;

    try {
      const token = getAuthToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      // ✅ Call backend API untuk approve
      await axios.put(
        `${API_URL}/revisions/${selectedRevision.id}/approve`,
        { review_notes: reviewNotes },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // ✅ Tutup dialog dan refresh data dari server
      setApproveDialogOpen(false);
      toast.success('✅ Revisi berhasil disetujui!');
      
      // ✅ Refresh data dari database (ganti semua DataService)
      await fetchData();
      
    } catch (error: any) {
      console.error("Error approving revision:", error);
      toast.error(error.response?.data?.detail || "Gagal menyetujui revisi");
    }
  };

  const submitRejection = async () => {
    if (!selectedRevision || !currentUser) return;

    if (!rejectReason.trim()) {
      toast.error('Alasan penolakan harus diisi!');
      return;
    }

    try {
      const token = getAuthToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      // ✅ Call backend API untuk reject
      await axios.put(
        `${API_URL}/revisions/${selectedRevision.id}/reject`,
        { reject_reason: rejectReason },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // ✅ Tutup dialog dan refresh data dari server
      setRejectDialogOpen(false);
      toast.error('❌ Revisi ditolak!');
      
      // ✅ Refresh data dari database (ganti semua DataService)
      await fetchData();
      
    } catch (error: any) {
      console.error("Error rejecting revision:", error);
      toast.error(error.response?.data?.detail || "Gagal menolak revisi");
    }
  };

  const submitEdit = async () => {
    if (!selectedRevision || !currentUser) return;

    try {
      const token = getAuthToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      // Call backend API
      await axios.put(
        `${API_URL}/revisions/${selectedRevision.id}`,
        {
          version: parseInt(editData.version) || selectedRevision.version,
          changes_description: editData.changesDescription,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setEditDialogOpen(false);
      toast.success('✅ Data revisi berhasil diperbarui!');
      fetchData(); // Refresh data dari server
    } catch (error: any) {
      console.error("Error updating revision:", error);
      toast.error("Gagal memperbarui data revisi");
    }
  };

  const submitUpload = async () => {
    if (!selectedRevision || !currentUser || !uploadFile) {
      toast.error('File belum dipilih!');
      return;
    }

    try {
      const token = getAuthToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // Update SOP file via API
        const sop = getSOPDocument(selectedRevision.sopId);
        if (sop) {
          try {
            await axios.put(
              `${API_URL}/sops/${sop.id}`,
              {
                file_url: base64String, // atau upload ke server dulu
              },
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              }
            );

            setUploadDialogOpen(false);
            toast.success('✅ File berhasil diupload!');
            fetchData(); // Refresh data
          } catch (error) {
            toast.error('❌ Gagal upload file!');
          }
        }
      };
      reader.readAsDataURL(uploadFile);
    } catch (error) {
      toast.error('❌ Gagal upload file!');
    }
  };

  // ===== FILTERED DATA =====
  const pendingRevisions = revisions.filter(r => r.status === 'menunggu_persetujuan');
  const approvedRevisions = revisions.filter(r => r.status === 'disetujui');
  const rejectedRevisions = revisions.filter(r => r.status === 'ditolak');

  // ===== PERMISSION CHECK UI =====
  if (!canManageRevisions()) {
    return (
      <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
        <aside className="fixed left-0 top-0 h-full w-64 z-30">
          <Sidebar activeMenu="revision" />
        </aside>
        <div className="ml-64 flex-1 flex flex-col relative z-10">
          <Header />
          <main className="flex-1 overflow-y-auto scroll-smooth p-6">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Anda tidak memiliki izin untuk mengakses halaman ini. Halaman ini hanya untuk Admin, Kepala Bagian, dan Ketua Tim. {/* ✅ Update text */}
              </AlertDescription>
            </Alert>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  // ===== BAGIAN 1 SELESAI =====
  // Return statement dan JSX ada di BAGIAN 2
  // ===== LANJUTAN DARI BAGIAN 1 =====
  // Ini adalah return statement dan semua JSX

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
      {/* Background animasi */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-24 left-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>

      {/* Sidebar fix di kiri */}
      <aside className="fixed left-0 top-0 h-full w-64 z-30">
        <Sidebar activeMenu="revision" />
      </aside>

      {/* Konten utama */}
      <div className="ml-64 flex-1 flex flex-col relative z-10">
        <Header />

        <main className="flex-1 overflow-y-auto scroll-smooth p-6">
          {/* Header Section */}
          <div className="mb-8 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                  <History className="h-8 w-8" />
                  Revisi & Riwayat
                </h1>
                <p className="text-blue-100">Kelola revisi SOP dan pantau riwayat perubahan dokumen</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className="bg-white text-purple-600 text-sm px-3 py-1">
                  {currentUser?.role === 'admin' ? 'Administrator' : currentUser?.role === 'kepala_bagian' ? 'Kepala_bagian' : 'Ketua Tim'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Modern Summary Cards with Gradient */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Total Revisi */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white transform hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <History className="h-6 w-6" />
                  </div>
                  <TrendingUp className="h-5 w-5 text-blue-100" />
                </div>
                <p className="text-sm text-blue-100 mb-1">Total Revisi</p>
                <p className="text-3xl font-bold">{revisions.length}</p>
                <p className="text-xs text-blue-100 mt-2">Semua periode</p>
              </CardContent>
            </Card>

            {/* Menunggu Persetujuan */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-orange-500 text-white transform hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div className="bg-white/20 px-2 py-1 rounded-full text-xs">
                    Perlu Tindakan
                  </div>
                </div>
                <p className="text-sm text-yellow-100 mb-1">Menunggu Persetujuan</p>
                <p className="text-3xl font-bold">{pendingRevisions.length}</p>
                <p className="text-xs text-yellow-100 mt-2">Segera ditinjau</p>
              </CardContent>
            </Card>

            {/* Disetujui */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white transform hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <CheckCircle className="h-6 w-6" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-green-100">Tingkat Persetujuan</p>
                    <p className="font-bold">
                      {revisions.length > 0 ? Math.round((approvedRevisions.length / revisions.length) * 100) : 0}%
                    </p>
                  </div>
                </div>
                <p className="text-sm text-green-100 mb-1">Disetujui</p>
                <p className="text-3xl font-bold">{approvedRevisions.length}</p>
                <p className="text-xs text-green-100 mt-2">Revisi berhasil</p>
              </CardContent>
            </Card>

            {/* Ditolak */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-pink-600 text-white transform hover:scale-105 transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <XCircle className="h-6 w-6" />
                  </div>
                  <Users className="h-5 w-5 text-red-100" />
                </div>
                <p className="text-sm text-red-100 mb-1">Ditolak</p>
                <p className="text-3xl font-bold">{rejectedRevisions.length}</p>
                <p className="text-xs text-red-100 mt-2">Perlu perbaikan</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Table Card with Modern Design */}
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-xl">Daftar Revisi SOP</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Tabs defaultValue="pending" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger 
                    value="pending" 
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-md transition-all"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Menunggu ({pendingRevisions.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="approved"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white rounded-md transition-all"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Disetujui ({approvedRevisions.length})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="rejected"
                    className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-md transition-all"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Ditolak ({rejectedRevisions.length})
                  </TabsTrigger>
                </TabsList>

                {/* TAB: MENUNGGU PERSETUJUAN */}
                <TabsContent value="pending" className="mt-6">
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <TableRow>
                          <TableHead className="font-semibold">SOP</TableHead>
                          <TableHead className="font-semibold">Versi</TableHead>
                          <TableHead className="font-semibold">Deskripsi Perubahan</TableHead>
                          <TableHead className="font-semibold">Direvisi Oleh</TableHead>
                          <TableHead className="font-semibold">Tanggal Revisi</TableHead>
                          <TableHead className="font-semibold">Status</TableHead>
                          <TableHead className="font-semibold text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingRevisions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12">
                              <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500 font-medium">Tidak ada revisi yang menunggu persetujuan</p>
                              <p className="text-sm text-gray-400 mt-1">Semua revisi telah ditinjau</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          pendingRevisions.map((revision) => (
                            <TableRow key={revision.id} className="hover:bg-yellow-50 transition-colors">
                              <TableCell>
                                <div>
                                  <p className="font-semibold text-gray-900">{revision.title}</p>
                                  <p className="text-sm text-gray-500">{getSOPTitle(revision.sopId)}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono">{revision.version}</Badge>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <p className="truncate text-sm">{revision.changesDescription}</p>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{getUserName(revision.revisedBy)}</span>
                              </TableCell>
                              <TableCell className="text-sm">
                                {format(new Date(revision.revisionDate), 'dd MMM yyyy', { locale: id })}
                              </TableCell>
                              <TableCell>{getStatusBadge(revision.status)}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="hover:bg-blue-50"
                                    onClick={() => handleViewRevision(revision)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="hover:bg-purple-50"
                                    onClick={() => handleEditRevision(revision)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-green-600 border-green-600 hover:bg-green-50"
                                    onClick={() => handleApproveRevision(revision)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-red-600 border-red-600 hover:bg-red-50"
                                    onClick={() => handleRejectRevision(revision)}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* TAB: DISETUJUI */}
                <TabsContent value="approved" className="mt-6">
                  <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                          <TableRow>
                            <TableHead className="font-semibold min-w-[200px]">SOP</TableHead>
                            <TableHead className="font-semibold min-w-[100px]">Versi</TableHead>
                            <TableHead className="font-semibold min-w-[200px]">Deskripsi Perubahan</TableHead>
                            <TableHead className="font-semibold min-w-[150px]">Direvisi Oleh</TableHead>
                            <TableHead className="font-semibold min-w-[150px]">Disetujui Oleh</TableHead>
                            <TableHead className="font-semibold min-w-[150px]">Tanggal Persetujuan</TableHead>
                            <TableHead className="font-semibold text-center min-w-[140px]">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {approvedRevisions.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-16">
                                <div className="flex flex-col items-center justify-center">
                                  <div className="rounded-full bg-green-50 p-4 mb-4">
                                    <CheckCircle className="h-12 w-12 text-green-400" />
                                  </div>
                                  <p className="text-gray-600 font-medium text-lg mb-1">
                                    Belum ada revisi yang disetujui
                                  </p>
                                  <p className="text-gray-400 text-sm">
                                    Revisi yang telah disetujui akan muncul di sini
                                  </p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            approvedRevisions.map((revision) => (
                              <TableRow 
                                key={revision.id} 
                                className="hover:bg-green-50/50 transition-colors duration-150"
                              >
                                <TableCell>
                                  <div className="space-y-1">
                                    <p className="font-semibold text-gray-900 line-clamp-2">
                                      {revision.title}
                                    </p>
                                    <p className="text-sm text-gray-500 line-clamp-1">
                                      {getSOPTitle(revision.sopId)}
                                    </p>
                                  </div>
                                </TableCell>
                                
                                <TableCell>
                                  <Badge 
                                    variant="outline" 
                                    className="font-mono bg-green-50 text-green-700 border-green-200"
                                  >
                                    {revision.version}
                                  </Badge>
                                </TableCell>
                                
                                <TableCell className="max-w-xs">
                                  <div className="group relative">
                                    <p className="text-sm text-gray-700 line-clamp-2">
                                      {revision.changesDescription}
                                    </p>
                                    {revision.changesDescription && revision.changesDescription.length > 80 && (
                                      <div className="absolute hidden group-hover:block z-10 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg max-w-sm -left-2 top-full mt-2">
                                        {revision.changesDescription}
                                        <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>
                                
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-xs">
                                      {getUserName(revision.revisedBy)?.charAt(0).toUpperCase() || '?'}
                                    </div>
                                    <span className="text-sm text-gray-700">
                                      {getUserName(revision.revisedBy)}
                                    </span>
                                  </div>
                                </TableCell>
                                
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    {revision.reviewedBy ? (
                                      <>
                                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-semibold text-xs">
                                          {getUserName(revision.reviewedBy)?.charAt(0).toUpperCase() || '?'}
                                        </div>
                                        <span className="text-sm text-gray-700">
                                          {getUserName(revision.reviewedBy)}
                                        </span>
                                      </>
                                    ) : (
                                      <span className="text-sm text-gray-400">-</span>
                                    )}
                                  </div>
                                </TableCell>
                                
                                <TableCell>
                                  {revision.approvalDate ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-700">
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                      {format(new Date(revision.approvalDate), 'dd MMM yyyy', { locale: id })}
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-400">-</span>
                                  )}
                                </TableCell>
                                
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                      onClick={() => handleViewRevision(revision)}
                                      title="Lihat Detail"
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="hover:bg-green-50 hover:text-green-600 transition-colors"
                                      onClick={() => handleDownloadRevision(revision)}
                                      title="Download"
                                    >
                                      <Download className="h-4 w-4" />
                                    </Button>
                                    
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="hover:bg-purple-50 hover:text-purple-600 transition-colors"
                                      onClick={() => handleUploadNewVersion(revision)}
                                      title="Upload Versi Baru"
                                    >
                                      <Upload className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB: DITOLAK */}
                <TabsContent value="rejected" className="mt-6">
                  <div className="rounded-xl border border-gray-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                        <TableRow>
                          <TableHead className="font-semibold">SOP</TableHead>
                          <TableHead className="font-semibold">Versi</TableHead>
                          <TableHead className="font-semibold">Deskripsi Perubahan</TableHead>
                          <TableHead className="font-semibold">Direvisi Oleh</TableHead>
                          <TableHead className="font-semibold">Alasan Penolakan</TableHead>
                          <TableHead className="font-semibold">Tanggal</TableHead>
                          <TableHead className="font-semibold text-center">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rejectedRevisions.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-12">
                              <XCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                              <p className="text-gray-500 font-medium">Tidak ada revisi yang ditolak</p>
                              <p className="text-sm text-gray-400 mt-1">Semua revisi memenuhi standar</p>
                            </TableCell>
                          </TableRow>
                        ) : (
                          rejectedRevisions.map((revision) => (
                            <TableRow key={revision.id} className="hover:bg-red-50 transition-colors">
                              <TableCell>
                                <div>
                                  <p className="font-semibold text-gray-900">{revision.title}</p>
                                  <p className="text-sm text-gray-500">{getSOPTitle(revision.sopId)}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="font-mono bg-red-50">{revision.version}</Badge>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <p className="truncate text-sm">{revision.changesDescription}</p>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm">{getUserName(revision.revisedBy)}</span>
                              </TableCell>
                              <TableCell className="max-w-xs">
                                <p className="truncate text-sm text-red-600">{revision.reviewNotes || '-'}</p>
                              </TableCell>
                              <TableCell className="text-sm">
                                {format(new Date(revision.revisionDate), 'dd MMM yyyy', { locale: id })}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="hover:bg-blue-50"
                                    onClick={() => handleViewRevision(revision)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="text-orange-600 border-orange-600 hover:bg-orange-50"
                                    onClick={() => handleEditRevision(revision)}
                                  >
                                    Revisi Ulang
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </main>
        
        <Footer />
      </div>

      {/* ===== DIALOGS ===== */}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detail Revisi</DialogTitle>
            <DialogDescription>Informasi lengkap revisi SOP</DialogDescription>
          </DialogHeader>
          {selectedRevision && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold">Judul Revisi</Label>
                <p className="text-sm mt-1">{selectedRevision.title}</p>
              </div>
              <div>
                <Label className="text-sm font-semibold">SOP Terkait</Label>
                <p className="text-sm mt-1">{getSOPTitle(selectedRevision.sopId)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Versi</Label>
                  <p className="text-sm mt-1">{selectedRevision.version}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Status</Label>
                  <div className="mt-1">{getStatusBadge(selectedRevision.status)}</div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-semibold">Deskripsi Perubahan</Label>
                <p className="text-sm mt-1">{selectedRevision.changesDescription}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Direvisi Oleh</Label>
                  <p className="text-sm mt-1">{getUserName(selectedRevision.revisedBy)}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Tanggal Revisi</Label>
                  <p className="text-sm mt-1">{format(new Date(selectedRevision.revisionDate), 'dd MMMM yyyy', { locale: id })}</p>
                </div>
              </div>
              {selectedRevision.reviewNotes && (
                <div>
                  <Label className="text-sm font-semibold">Catatan Review</Label>
                  <p className="text-sm mt-1">{selectedRevision.reviewNotes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setujui Revisi</DialogTitle>
            <DialogDescription>Berikan catatan persetujuan untuk revisi ini</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reviewNotes">Catatan Persetujuan (Opsional)</Label>
              <Textarea
                id="reviewNotes"
                rows={4}
                placeholder="Tambahkan catatan atau komentar..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Batal
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={submitApproval}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Setujui Revisi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Revisi</DialogTitle>
            <DialogDescription>Berikan alasan penolakan revisi ini</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="rejectReason">Alasan Penolakan *</Label>
              <Textarea
                id="rejectReason"
                rows={4}
                placeholder="Jelaskan alasan penolakan..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="border-red-300 focus:border-red-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Batal
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={submitRejection}>
              <XCircle className="h-4 w-4 mr-2" />
              Tolak Revisi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Data Revisi</DialogTitle>
            <DialogDescription>Perbarui informasi revisi SOP</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editVersion">Versi</Label>
              <Input
                id="editVersion"
                value={editData.version}
                onChange={(e) => setEditData({ ...editData, version: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="editDescription">Deskripsi Perubahan</Label>
              <Textarea
                id="editDescription"
                rows={4}
                value={editData.changesDescription}
                onChange={(e) => setEditData({ ...editData, changesDescription: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={submitEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Simpan Perubahan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Dokumen Revisi Baru</DialogTitle>
            <DialogDescription>Upload file PDF versi terbaru dari revisi ini</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="uploadFile">File PDF</Label>
              <Input
                id="uploadFile"
                type="file"
                accept=".pdf"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="mt-2"
              />
              {uploadFile && (
                <p className="text-sm text-gray-500 mt-2">
                  File terpilih: {uploadFile.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={submitUpload} disabled={!uploadFile}>
              <Upload className="h-4 w-4 mr-2" />
              Upload File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}