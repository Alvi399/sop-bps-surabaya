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
import { Eye, Download, CheckCircle, XCircle, Clock, History, TrendingUp, Users, FileText, Upload, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'sonner';
import { useRealtimeSubscription, notifyRealtimeUpdate } from '@/lib/realtime';
import axios from "axios";

import { API_URL } from "@/lib/api";

const getAuthToken = () => {
  const authData = localStorage.getItem('bps_sop_auth');
  if (!authData) return null;
  const user = JSON.parse(authData);
  return user.token || null;
};

export function RevisionSection() {
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

  const fetchData = async (isBackground = false) => {
    try {
      const token = getAuthToken();
      
      if (!token) {
        if (!isBackground) {
          toast.error("Session expired. Please login again.");
        }
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
      
      // ✅ Fetch users dari backend
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
        if (!isBackground) {
          toast.error("Session expired. Please login again.");
          AuthService.logout();
        }
      } else if (!isBackground) {
        toast.error("Gagal memuat data");
      }
    }
  };

  // ===== USE EFFECT & REALTIME SYNC =====
  useEffect(() => {
    fetchData(false);
  }, []);

  useRealtimeSubscription(() => {
    fetchData(true);
  }, 3000);

  // ===== PERMISSION CONTROL =====
  const canApproveRevisions = () => {
    if (!currentUser) return false;
    return ['admin', 'kepala_bagian', 'ketua_tim'].includes(currentUser.role);
  };

  const canManageRevisions = () => {
    if (!currentUser) return false;
    return ['admin', 'kepala_bagian', 'ketua_tim', 'staf'].includes(currentUser.role);
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
    if (!canApproveRevisions()) {
      toast.error('Anda tidak memiliki izin untuk menyetujui revisi!');
      return;
    }
    setSelectedRevision(revision);
    setReviewNotes('');
    setApproveDialogOpen(true);
  };

  const handleRejectRevision = (revision: SOPRevision) => {
    if (!canApproveRevisions()) {
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

  const handleDeleteRevision = async (revisionId: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data riwayat revisi ini?")) {
      return;
    }

    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      await axios.delete(`${API_URL}/revisions/${revisionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Riwayat revisi berhasil dihapus!");
      notifyRealtimeUpdate("revision_deleted");
      await fetchData();
    } catch (error: any) {
      console.error("Error deleting revision:", error);
      toast.error(error.response?.data?.detail || "Gagal menghapus riwayat revisi");
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
        const base64Clean = base64String.split(',')[1] || base64String;
        
        // Update SOP file via API
        const sop = getSOPDocument(selectedRevision.sopId);
        if (sop) {
          try {
            await axios.put(
              `${API_URL}/sops/${sop.id}`,
              {
                file_url: base64String,
                file_base64: base64Clean,
                is_manual: true,
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
          } catch (error: any) {
            console.error("Error upload file revision:", error);
            toast.error(error.response?.data?.detail || '❌ Gagal upload file!');
          }
        }
      };
      reader.readAsDataURL(uploadFile);
    } catch (error: any) {
      console.error("Error reading file:", error);
      toast.error('❌ Gagal upload file!');
    }
  };

  // ===== FILTERED DATA =====
  const pendingRevisions = revisions.filter(r => r.status === 'menunggu_persetujuan');
  const approvedRevisions = revisions.filter(r => r.status === 'disetujui');
  const rejectedRevisions = revisions.filter(r => r.status === 'ditolak');

  // ===== PERMISSION CHECK UI =====
  if (!currentUser) {
    return (
      <Alert className="border-red-200 bg-red-50 my-4">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Silakan login untuk mengakses fitur riwayat revisi SOP.
        </AlertDescription>
      </Alert>
    );
  }

  // ===== BAGIAN 1 SELESAI =====
  // Return statement dan JSX ada di BAGIAN 2
  // ===== LANJUTAN DARI BAGIAN 1 =====
  // Ini adalah return statement dan semua JSX

  return (
    <div className="space-y-6">
      {/* Modern Summary Cards with Gradient */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Revisi */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white transform hover:scale-[1.02] transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <History className="h-6 w-6" />
              </div>
              <TrendingUp className="h-5 w-5 text-blue-100" />
            </div>
            <p className="text-sm text-blue-100 mb-1">Total Riwayat Revisi</p>
            <p className="text-3xl font-bold">{revisions.length}</p>
            <p className="text-xs text-blue-100 mt-2">Semua periode</p>
          </CardContent>
        </Card>

        {/* Disetujui */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white transform hover:scale-[1.02] transition-all duration-300">
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
        <Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-pink-600 text-white transform hover:scale-[1.02] transition-all duration-300">
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
      <Card className="bg-white/80 backdrop-blur-md border-white/20 shadow-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg text-white">
                <History className="h-5 w-5" />
              </div>
              <CardTitle className="text-xl">Riwayat & Revisi SOP</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="approved" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100/80 p-1 rounded-lg mb-6">
              <TabsTrigger 
                value="approved"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white rounded-md transition-all font-medium text-sm"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Disetujui ({approvedRevisions.length})
              </TabsTrigger>
              <TabsTrigger 
                value="rejected"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-pink-600 data-[state=active]:text-white rounded-md transition-all font-medium text-sm"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Ditolak ({rejectedRevisions.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB: DISETUJUI */}
            <TabsContent value="approved">
              <div className="rounded-xl border border-gray-200 overflow-x-auto bg-white/50 backdrop-blur-sm">
                <Table className="min-w-[850px]">
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-blue-50 to-purple-50">
                      <TableHead>SOP</TableHead>
                      <TableHead>Versi</TableHead>
                      <TableHead>Deskripsi Perubahan</TableHead>
                      <TableHead>Direvisi Oleh</TableHead>
                      <TableHead>Disetujui Oleh</TableHead>
                      <TableHead>Tanggal Persetujuan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
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
                          className="hover:bg-white/60 transition-colors"
                        >
                          <TableCell>
                            <div>
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
                              v{revision.version}
                            </Badge>
                          </TableCell>
                          
                          <TableCell className="max-w-xs">
                            <p className="text-sm text-gray-700 line-clamp-2">
                              {revision.changesDescription}
                            </p>
                          </TableCell>
                          
                          <TableCell>
                            <span className="text-sm text-gray-700 font-medium">
                              {getUserName(revision.revisedBy)}
                            </span>
                          </TableCell>
                          
                          <TableCell>
                            {revision.reviewedBy ? (
                              <span className="text-sm text-gray-700 font-medium">
                                {getUserName(revision.reviewedBy)}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            {revision.approvalDate ? (
                              <div className="flex items-center gap-1 text-sm text-gray-700">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                {format(new Date(revision.approvalDate), 'dd MMM yyyy', { locale: id })}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewRevision(revision)}
                                title="Lihat Detail Revisi"
                                className="hover:bg-blue-50 text-blue-600"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownloadRevision(revision)}
                                title="Download Dokumen"
                                className="hover:bg-gray-100 text-gray-700"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUploadNewVersion(revision)}
                                title="Upload Dokumen Versi Baru"
                                className="hover:bg-purple-50 text-purple-600"
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
            </TabsContent>

            {/* TAB: DITOLAK */}
            <TabsContent value="rejected">
              <div className="rounded-xl border border-gray-200 overflow-x-auto bg-white/50 backdrop-blur-sm">
                <Table className="min-w-[850px]">
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-blue-50 to-purple-50">
                      <TableHead>SOP</TableHead>
                      <TableHead>Versi</TableHead>
                      <TableHead>Deskripsi Perubahan</TableHead>
                      <TableHead>Direvisi Oleh</TableHead>
                      <TableHead>Alasan Penolakan</TableHead>
                      <TableHead>Tanggal Penolakan</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
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
                        <TableRow key={revision.id} className="hover:bg-white/60 transition-colors">
                          <TableCell>
                            <div>
                              <p className="font-semibold text-gray-900">{revision.title}</p>
                              <p className="text-sm text-gray-500">{getSOPTitle(revision.sopId)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono bg-red-50 text-red-700">v{revision.version}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="truncate text-sm">{revision.changesDescription}</p>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium text-gray-700">{getUserName(revision.revisedBy)}</span>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="text-sm text-red-600 font-medium">{revision.reviewNotes || '-'}</p>
                          </TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(revision.revisionDate), 'dd MMM yyyy', { locale: id })}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewRevision(revision)}
                                title="Lihat Detail Revisi"
                                className="hover:bg-blue-50 text-blue-600"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUploadNewVersion(revision)}
                                title="Upload Dokumen Baru Setelah Ditolak"
                                className="hover:bg-purple-50 text-purple-600"
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
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>


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

export default function Revision() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
      <Sidebar activeMenu="management" />

      <div className="ml-0 lg:ml-64 flex-1 min-w-0 flex flex-col relative z-10">
        <Header />
        <main className="flex-1 overflow-y-auto scroll-smooth p-4 md:p-6">
          <RevisionSection />
        </main>
        <Footer />
      </div>
    </div>
  );
}