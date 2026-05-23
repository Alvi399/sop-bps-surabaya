import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  User,
  Lock,
  Shield,
  Database,
  FileText,
  Camera,
  Save,
  Download,
  Clock,
  Activity,
  CheckCircle2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AuthService } from "@/lib/auth";
import axios from "axios";

const API_URL = "http://localhost:8000/api";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department?: string;
  phone?: string;
  avatar_url?: string;
  join_date?: string;
  last_login?: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userStats, setUserStats] = useState({
    sopsCreated: 0,
    sopsApproved: 0,
  });

  const [profileData, setProfileData] = useState({
    fullName: "",
    email: "",
    department: "",
    phone: "",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // ✅ Fetch user data on mount
  useEffect(() => {
    fetchUserData();
  }, []);

  // ✅ Update profile data when user is loaded
  useEffect(() => {
    if (user) {
      setProfileData({
        fullName: user.full_name || "",
        email: user.email || "",
        department: user.department || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const fetchUserData = async () => {
    try {
      const token = AuthService.getToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        navigate("/login");
        return;
      }

      // Fetch current user
      const userResponse = await axios.get(`${API_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUser(userResponse.data);

      // Fetch user stats
      await fetchUserStats(userResponse.data.id, token);

      setLoading(false);
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        AuthService.logout();
        navigate("/login");
      } else {
        toast.error("Failed to load user data");
      }
      
      setLoading(false);
    }
  };

  const fetchUserStats = async (userId: string, token: string) => {
    try {
      const activitiesResponse = await axios.get(`${API_URL}/activities?limit=100`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const activities = activitiesResponse.data;
      
      const sopsCreated = activities.filter(
        (a: any) => a.user_id === userId && a.action.toLowerCase().includes('create')
      ).length;
      
      const sopsApproved = activities.filter(
        (a: any) => a.user_id === userId && a.action.toLowerCase().includes('approve')
      ).length;

      setUserStats({
        sopsCreated,
        sopsApproved,
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
    }
  };

  // 📸 Handle Upload Foto
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar (JPG, PNG, dll)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 5MB");
      return;
    }

    setUploadingPhoto(true);

    try {
      const token = AuthService.getToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        setUploadingPhoto(false);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        
        try {
          await axios.put(
            `${API_URL}/users/me/avatar`,
            { avatar_url: base64Image },
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            }
          );

          // Update local state
          setUser(prev => prev ? { ...prev, avatar_url: base64Image } : null);
          toast.success("Foto profil berhasil diperbarui!");
        } catch (error: any) {
          console.error("Error updating avatar:", error);
          toast.error("Gagal memperbarui foto profil");
        } finally {
          setUploadingPhoto(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Gagal membaca file");
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const token = AuthService.getToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      await axios.put(
        `${API_URL}/users/me/avatar`,
        { avatar_url: "" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setUser(prev => prev ? { ...prev, avatar_url: "" } : null);
      toast.success("Foto profil dihapus");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      console.error("Error removing avatar:", error);
      toast.error("Gagal menghapus foto profil");
    }
  };

  const triggerFileInput = () => fileInputRef.current?.click();

  // 🔐 Handle Update Password
  const handlePasswordChange = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast.error("Semua field password harus diisi!");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("Password baru tidak cocok!");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password minimal 6 karakter!");
      return;
    }

    try {
      const token = AuthService.getToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      await axios.put(
        `${API_URL}/users/me/password`,
        {
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      toast.success("Password berhasil diperbarui!");
    } catch (error: any) {
      console.error("Error updating password:", error);
      
      if (error.response?.status === 400) {
        toast.error("Password lama tidak sesuai");
      } else if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        AuthService.logout();
        navigate("/login");
      } else {
        toast.error("Gagal memperbarui password");
      }
    }
  };

  // 👤 Handle Update Profil
  const handleProfileUpdate = async () => {
    if (!profileData.fullName || !profileData.email) {
      toast.error("Nama dan email harus diisi!");
      return;
    }

    try {
      const token = AuthService.getToken();
      
      if (!token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      const response = await axios.put(
        `${API_URL}/users/me`,
        {
          full_name: profileData.fullName,
          email: profileData.email,
          phone: profileData.phone,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Update local state
      setUser(prev => prev ? {
        ...prev,
        full_name: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
      } : null);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      toast.success("Profil berhasil diperbarui!");
    } catch (error: any) {
      console.error("Error updating profile:", error);
      
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        AuthService.logout();
        navigate("/login");
      } else if (error.response?.status === 400) {
        toast.error("Email sudah digunakan oleh user lain");
      } else {
        toast.error("Gagal memperbarui profil");
      }
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { class: string; label: string }> = {
      admin: { class: "bg-rose-100 text-rose-700", label: "Administrator" },
      kepala_bagian: { class: "bg-blue-100 text-blue-700", label: "Kepala Bagian" },
      ketua_tim: { class: "bg-purple-100 text-purple-700", label: "Ketua Tim" },
      staf: { class: "bg-slate-100 text-slate-700", label: "Staf" },
    };

    const config = variants[role] || variants.staf;
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.class}`}
      >
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Tidak tersedia";
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return "Tidak tersedia";
    }
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return "Belum pernah login";
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "Belum pernah login";
    }
  };

  const handleExportExcel = () => {
    toast.info("Fitur export Excel akan segera hadir!");
  };

  const handleExportPDF = () => {
    toast.info("Fitur export PDF akan segera hadir!");
  };

  const handleExportCSV = () => {
    toast.info("Fitur export CSV akan segera hadir!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <p className="text-gray-600">Failed to load user data</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      </div>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 z-30">
        <Sidebar activeMenu="settings" />
      </aside>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div className="ml-64 flex-1 flex flex-col relative z-10">
        <Header />

        <main className="flex-1 overflow-y-auto scroll-smooth p-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Pengaturan</h1>
                <p className="text-slate-600">
                  Kelola akun dan preferensi sistem Anda
                </p>
              </div>
            </div>
          </div>

          {showSuccess && (
            <Alert className="mb-6 border-emerald-200 bg-emerald-50 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800 font-medium ml-2">
                Pengaturan berhasil disimpan!
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="profile" className="w-full">
            <div className="grid grid-cols-12 gap-6">
              {/* Left menu */}
              <div className="col-span-3 space-y-6">
                <Card className="border-0 shadow-sm sticky top-6">
                  <CardContent className="p-4">
                    <TabsList className="flex flex-col h-auto w-full bg-transparent gap-1">
                      <TabsTrigger
                        value="profile"
                        className="w-full justify-start data-[state=active]:bg-violet-50 data-[state=active]:text-violet-900 rounded-lg px-4 py-3 hover:bg-slate-50 transition-all"
                      >
                        <User className="h-4 w-4 mr-3" />
                        Profil Saya
                      </TabsTrigger>

                      <TabsTrigger
                        value="security"
                        className="w-full justify-start data-[state=active]:bg-violet-50 data-[state=active]:text-violet-900 rounded-lg px-4 py-3 hover:bg-slate-50 transition-all"
                      >
                        <Lock className="h-4 w-4 mr-3" />
                        Keamanan
                      </TabsTrigger>

                      <TabsTrigger
                        value="system"
                        className="w-full justify-start data-[state=active]:bg-violet-50 data-[state=active]:text-violet-900 rounded-lg px-4 py-3 hover:bg-slate-50 transition-all"
                      >
                        <Database className="h-4 w-4 mr-3" />
                        Sistem
                      </TabsTrigger>
                    </TabsList>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Aktivitas Anda
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-600">SOP Dibuat</span>
                      <span className="text-lg font-bold text-slate-900">
                        {userStats.sopsCreated}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-slate-100">
                      <span className="text-sm text-slate-600">SOP Disetujui</span>
                      <span className="text-lg font-bold text-emerald-600">
                        {userStats.sopsApproved}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right content */}
              <div className="col-span-9">
                {/* PROFILE TAB */}
                <TabsContent value="profile" className="mt-0 space-y-6">
                  <Card className="border-0 shadow-sm bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 text-white">
                    <CardContent className="p-8">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-6">
                          <div className="relative">
                            <Avatar className="h-24 w-24 border-4 border-white/30 shadow-xl">
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback className="text-2xl bg-white/20 text-white font-bold">
                                {user.full_name?.charAt(0).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <button
                              onClick={triggerFileInput}
                              disabled={uploadingPhoto}
                              className="absolute bottom-0 right-0 h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform disabled:opacity-50"
                            >
                              {uploadingPhoto ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-600"></div>
                              ) : (
                                <Camera className="h-4 w-4 text-violet-600" />
                              )}
                            </button>
                            {user.avatar_url && (
                              <button
                                onClick={handleRemovePhoto}
                                className="absolute -top-1 -right-1 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                              >
                                <X className="h-3 w-3 text-white" />
                              </button>
                            )}
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold mb-1">{user.full_name}</h2>
                            <p className="text-white/80 mb-3">{user.email}</p>
                            <div className="flex items-center gap-3">
                              {getRoleBadge(user.role)}
                              {user.department && (
                                <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-medium">
                                  {user.department}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white/70 text-sm mb-1">Bergabung sejak</p>
                          <p className="text-xl font-bold">{formatDate(user.join_date)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Edit Profil */}
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="border-b border-slate-100">
                      <CardTitle className="text-lg font-semibold text-slate-900">
                        Edit Profil
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="space-y-2">
                          <Label htmlFor="fullName">Nama Lengkap *</Label>
                          <Input
                            id="fullName"
                            value={profileData.fullName}
                            onChange={(e) =>
                              setProfileData((p) => ({
                                ...p,
                                fullName: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input
                            id="email"
                            type="email"
                            value={profileData.email}
                            onChange={(e) =>
                              setProfileData((p) => ({
                                ...p,
                                email: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Nomor Telepon</Label>
                          <Input
                            id="phone"
                            value={profileData.phone}
                            onChange={(e) =>
                              setProfileData((p) => ({
                                ...p,
                                phone: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="department">Departemen</Label>
                          <Input
                            id="department"
                            value={profileData.department}
                            disabled
                            className="bg-slate-50 border-slate-200"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleProfileUpdate}
                        className="bg-violet-600 hover:bg-violet-700"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Simpan Perubahan
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* SECURITY TAB */}
                <TabsContent value="security" className="mt-0 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="border-b border-slate-100">
                        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                          <Lock className="h-5 w-5 text-violet-600" />
                          Ubah Password
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <div>
                          <Label htmlFor="currentPassword">Password Saat Ini</Label>
                          <Input
                            id="currentPassword"
                            type="password"
                            placeholder="Masukkan password saat ini"
                            value={passwordData.currentPassword}
                            onChange={(e) =>
                              setPasswordData((p) => ({
                                ...p,
                                currentPassword: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="newPassword">Password Baru</Label>
                          <Input
                            id="newPassword"
                            type="password"
                            placeholder="Minimal 6 karakter"
                            value={passwordData.newPassword}
                            onChange={(e) =>
                              setPasswordData((p) => ({
                                ...p,
                                newPassword: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Ulangi password baru"
                            value={passwordData.confirmPassword}
                            onChange={(e) =>
                              setPasswordData((p) => ({
                                ...p,
                                confirmPassword: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <Button
                          onClick={handlePasswordChange}
                          className="w-full bg-violet-600 hover:bg-violet-700"
                        >
                          <Lock className="h-4 w-4 mr-2" /> Update Password
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <CardHeader className="border-b border-slate-100">
                        <CardTitle className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                          <Shield className="h-5 w-5 text-violet-600" />
                          Keamanan Akun
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Clock className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 mb-1">
                              Login Terakhir
                            </p>
                            <p className="text-sm text-slate-600">
                              {formatDateTime(user.last_login)}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              Lokasi: Surabaya, Indonesia
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* SYSTEM TAB */}
                <TabsContent value="system" className="mt-0 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="border-b border-slate-100">
                        <CardTitle className="flex items-center gap-2">
                          <Database className="h-5 w-5 text-violet-600" />
                          Informasi Sistem
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-3">
                        <p className="text-sm text-slate-700">
                          Versi Sistem: <b>v2.1.0</b>
                        </p>
                        <p className="text-sm text-slate-700">
                          Database: <b>PostgreSQL 14</b>
                        </p>
                        <p className="text-sm text-slate-700">
                          Last Update: <b>12 Dec 2025</b>
                        </p>
                        <p className="text-sm text-slate-700">
                          Uptime: <b className="text-emerald-600">99.9%</b>
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm">
                      <CardHeader className="border-b border-slate-100">
                        <CardTitle className="flex items-center gap-2">
                          <Download className="h-5 w-5 text-violet-600" />
                          Backup & Export
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={handleExportExcel}
                        >
                          <FileText className="h-4 w-4 mr-2 text-green-600" />
                          Export ke Excel
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={handleExportPDF}
                        >
                          <FileText className="h-4 w-4 mr-2 text-red-600" />
                          Export ke PDF
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={handleExportCSV}
                        >
                          <Database className="h-4 w-4 mr-2 text-blue-600" />
                          Export ke CSV
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </div>
            </div>
          </Tabs>
        </main>

        <Footer />
      </div>
    </div>
  );
}