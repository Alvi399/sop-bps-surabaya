import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuthService } from "@/lib/auth";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import axios from "axios";

const API_URL = "http://localhost:8000/api";

export default function EditSOP() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    department: "",
    responsible_person: "",
    effectiveDate: "",
    expiryDate: "",
    status: "aktif",
  });

  const departments = [
    "Statistik Sosial",
    "Statistik Harga",
    "Statistik Produksi",
    "Statistik Distribusi",
    "Neraca Wilayah dan Analisis Statistik",
    "Integrasi Pengolahan dan Diseminasi Statistik",
    "Humas",
    "Diseminasi (Pojok Statistik dan PSS)",
    "Zona Integritas",
    "Statistik Susenas dan Sakerduk",
    "Umum",
  ];

  // Fetch SOP data from backend
  useEffect(() => {
    fetchSOPData();
  }, [id]);

  const fetchSOPData = async () => {
    try {
      setLoading(true);
      const token = AuthService.getToken();

      if (!token) {
        toast.error("Session expired. Please login again.");
        navigate("/login");
        return;
      }

      console.log("🔍 Fetching SOP with ID:", id);

      const response = await axios.get(`${API_URL}/sops/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("✅ SOP data received:", response.data);

      const sop = response.data;

      // Format date untuk input type="date" (YYYY-MM-DD)
      const formatDateForInput = (dateStr: string) => {
        if (!dateStr) return "";
        // Jika sudah format YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
        // Convert ke YYYY-MM-DD
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
      };

      setFormData({
        code: sop.code || "",
        title: sop.title || "",
        description: sop.description || "",
        department: sop.department || "",
        responsible_person: sop.responsible_person || "",
        effectiveDate: formatDateForInput(sop.effective_date),
        expiryDate: formatDateForInput(sop.expiry_date),
        status: sop.status || "aktif",
      });

      setLoading(false);
    } catch (error: any) {
      console.error("❌ Error fetching SOP:", error);
      
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        AuthService.logout();
        navigate("/login");
      } else if (error.response?.status === 404) {
        toast.error("Data SOP tidak ditemukan!");
        navigate("/management");
      } else {
        toast.error("Gagal memuat data SOP");
      }
      
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    // Validasi
    if (!formData.title || !formData.department) {
      toast.error("Judul dan Departemen harus diisi!");
      return;
    }

    setSaving(true);

    try {
      const token = AuthService.getToken();

      if (!token) {
        toast.error("Session expired. Please login again.");
        navigate("/login");
        return;
      }

      const updateData = {
        title: formData.title,
        description: formData.description,
        department: formData.department,
        responsible_person: formData.responsible_person,
        status: formData.status,
        effective_date: formData.effectiveDate,
        expiry_date: formData.expiryDate || null,
      };

      console.log("📤 Updating SOP with data:", updateData);

      await axios.put(`${API_URL}/sops/${id}`, updateData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      toast.success("✅ Data SOP berhasil diperbarui!");
      navigate("/management");
    } catch (error: any) {
      console.error("❌ Error updating SOP:", error);
      
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        AuthService.logout();
        navigate("/login");
      } else if (error.response?.status === 403) {
        toast.error("Anda tidak memiliki akses untuk mengedit SOP ini");
      } else {
        toast.error("Gagal mengupdate SOP");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data SOP...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex overflow-hidden">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 z-30">
        <Sidebar activeMenu="management" />
      </aside>

      {/* Konten utama */}
      <div className="ml-64 flex-1 flex flex-col relative z-10">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate("/management")}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kembali ke Manajemen SOP
            </Button>

            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Edit Data SOP
            </h1>
            <p className="text-gray-600">
              Edit informasi dokumen SOP - Kode: {formData.code}
            </p>
          </div>

          <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-blue-200">
            <CardHeader>
              <CardTitle>Form Edit SOP</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Kode SOP (Read-only) */}
                <div>
                  <label className="font-semibold text-gray-700 text-sm block mb-1.5">
                    Kode SOP
                  </label>
                  <Input
                    name="code"
                    value={formData.code}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                {/* Judul SOP */}
                <div>
                  <label className="font-semibold text-gray-700 text-sm block mb-1.5">
                    Judul SOP *
                  </label>
                  <Input
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* Tim / Departemen */}
                <div>
                  <label className="font-semibold text-gray-700 text-sm block mb-1.5">
                    Tim / Departemen *
                  </label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => handleSelectChange("department", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Departemen" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Penanggung Jawab */}
                <div>
                  <label className="font-semibold text-gray-700 text-sm block mb-1.5">
                    Penanggung Jawab
                  </label>
                  <Input
                    name="responsible_person"
                    value={formData.responsible_person}
                    onChange={handleChange}
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="font-semibold text-gray-700 text-sm block mb-1.5">
                    Status
                  </label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleSelectChange("status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="aktif">Aktif</SelectItem>
                      <SelectItem value="revisi">Perlu Revisi</SelectItem>
                      <SelectItem value="kedaluwarsa">Kedaluwarsa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Tanggal Berlaku */}
                <div>
                  <label className="font-semibold text-gray-700 text-sm block mb-1.5">
                    Tanggal Berlaku
                  </label>
                  <Input
                    type="date"
                    name="effectiveDate"
                    value={formData.effectiveDate}
                    onChange={handleChange}
                  />
                </div>

                {/* Tanggal Kedaluwarsa */}
                <div>
                  <label className="font-semibold text-gray-700 text-sm block mb-1.5">
                    Tanggal Kedaluwarsa
                  </label>
                  <Input
                    type="date"
                    name="expiryDate"
                    value={formData.expiryDate}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Deskripsi SOP */}
              <div>
                <label className="font-semibold text-gray-700 text-sm block mb-1.5">
                  Deskripsi SOP
                </label>
                <Textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Deskripsi singkat tentang SOP ini..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
                <div className="flex gap-3">
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Menyimpan..." : "Simpan Perubahan"}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => navigate(`/edit-pdf/${id}`)}
                  >
                    Edit File PDF
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  onClick={() => navigate("/management")}
                  className="text-gray-600"
                >
                  Batal
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </div>
  );
}