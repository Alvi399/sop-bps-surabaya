// src/pages/CreateSOP.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, Save, Send, Sparkles, Workflow, FileText, 
  Plus, Trash2, MoveUp, MoveDown, X
} from "lucide-react";
import { DataService } from "@/lib/mockData";
import { AuthService } from "@/lib/auth";
import { SOPDocument } from "@/types";
import { toast } from "sonner";
import generateSOPPdf from "@/lib/pdfGenerator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, CheckCircle } from "lucide-react";

// ✅ API Configuration
const API_URL = "http://localhost:8000";

// ✅ Helper function untuk get token
const getAuthToken = () => {
  const authData = localStorage.getItem('bps_sop_auth');
  if (!authData) return null;
  const user = JSON.parse(authData);
  return user.token || null; // Sesuaikan dengan struktur token Anda
};

// Helper function to format date from YYYY-MM-DD to DD Month YYYY
const formatDate = (dateString: string): string => {
  if (!dateString) return "-";
  
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  
  const date = new Date(dateString);
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
};

interface FlowchartStep {
  no: number;
  aktivitas: string;
  pelaksana: { [key: string]: boolean }; // Dynamic pelaksana columns
  mutuBaku: {
    persyaratan: string;
    output: string;
    waktu: string;
  };
  keterangan: string;
  shapes: { [key: string]: string }; // Map of pelaksana name -> shape
}

export default function CreateSOP() {
  const [formData, setFormData] = useState({
    code: "",
    tanggalPembuatan: "",
    tanggalRevisi: "",
    tanggalEfektif: "",
    title: "",
    department: "",
    responsiblePerson: "",
    dasarHukum: "",
    kualifikasiPelaksana: "",
    keterkaitan: "",
    peralatanPerlengkapan: "",
    peringatan: "",
    pencatatanPendataan: "",
    maksud: "",
    tujuan: "",
    description: "",
    effectiveDate: "",
    expiryDate: "",
  });

  // Pelaksana columns (dynamic)
  const [pelaksanaColumns, setPelaksanaColumns] = useState<string[]>([
    "Kasubbag Tata Usaha",
    "Staff",
    "Bina Program BPS Provinsi",
  ]);
  const [newPelaksanaName, setNewPelaksanaName] = useState("");

  // Flowchart steps
  const [flowchartSteps, setFlowchartSteps] = useState<FlowchartStep[]>([
    {
      no: 1,
      aktivitas: "",
      pelaksana: {
        "Kasubbag Tata Usaha": false,
        "Staff": false,
        "Bina Program BPS Provinsi": false,
      },
      mutuBaku: {
        persyaratan: "",
        output: "",
        waktu: "",
      },
      keterangan: "",
      shapes: {},
    },
  ]);

  const [aiSuggestion, setAiSuggestion] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFlowchart, setShowFlowchart] = useState(false);
  // custom shape images: { stepIndex: Uint8Array }
  const [customShapeImages, setCustomShapeImages] = useState<{ [key: number]: Uint8Array }>({});
  const [finalAction, setFinalAction] = useState<string>("none");

  const [activeTab, setActiveTab] = useState("generate"); // "generate" or "upload"

  // Form data untuk upload PDF manual
  const [uploadFormData, setUploadFormData] = useState({
    code: "",
    title: "",
    department: "",
    responsiblePerson: "",
    effectiveDate: "",
    expiryDate: "",
    description: "",
    status: "draft"
  });

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ===== PELAKSANA COLUMN MANAGEMENT =====
  const addPelaksanaColumn = () => {
    if (!newPelaksanaName.trim()) {
      toast.error("Nama pelaksana tidak boleh kosong!");
      return;
    }
    
    if (pelaksanaColumns.includes(newPelaksanaName.trim())) {
      toast.error("Nama pelaksana sudah ada!");
      return;
    }

    const newColumn = newPelaksanaName.trim();
    setPelaksanaColumns([...pelaksanaColumns, newColumn]);

    // Update all existing steps
    setFlowchartSteps(
      flowchartSteps.map((step) => ({
        ...step,
        pelaksana: {
          ...step.pelaksana,
          [newColumn]: false,
        },
      }))
    );

    setNewPelaksanaName("");
    toast.success("Kolom pelaksana berhasil ditambahkan!");
  };

  const removePelaksanaColumn = (columnName: string) => {
    if (pelaksanaColumns.length <= 1) {
      toast.error("Minimal harus ada 1 kolom pelaksana!");
      return;
    }

    setPelaksanaColumns(pelaksanaColumns.filter((col) => col !== columnName));

    // Remove from all steps
    setFlowchartSteps(
      flowchartSteps.map((step) => {
        const { [columnName]: removed, ...rest } = step.pelaksana;
        return {
          ...step,
          pelaksana: rest,
        };
      })
    );

    toast.success("Kolom pelaksana berhasil dihapus!");
  };

  // ===== FLOWCHART STEP MANAGEMENT =====
  const addFlowchartStep = () => {
    const pelaksanaObj: { [key: string]: boolean } = {};
    pelaksanaColumns.forEach((col) => {
      pelaksanaObj[col] = false;
    });

    setFlowchartSteps([
      ...flowchartSteps,
      {
        no: flowchartSteps.length + 1,
        aktivitas: "",
        pelaksana: pelaksanaObj,
        mutuBaku: {
          persyaratan: "",
          output: "",
          waktu: "",
        },
        keterangan: "",
        shapes: {},
      },
    ]);
  };

  const removeFlowchartStep = (index: number) => {
    if (flowchartSteps.length <= 1) {
      toast.error("Minimal harus ada 1 langkah!");
      return;
    }

    const updated = flowchartSteps.filter((_, i) => i !== index);
    updated.forEach((step, i) => {
      step.no = i + 1;
    });
    setFlowchartSteps(updated);
  };

  const moveStepUp = (index: number) => {
    if (index === 0) return;
    const updated = [...flowchartSteps];
    [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
    updated.forEach((step, i) => {
      step.no = i + 1;
    });
    setFlowchartSteps(updated);
  };

  const moveStepDown = (index: number) => {
    if (index === flowchartSteps.length - 1) return;
    const updated = [...flowchartSteps];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    updated.forEach((step, i) => {
      step.no = i + 1;
    });
    setFlowchartSteps(updated);
  };

  const updateFlowchartStep = (index: number, field: string, value: any) => {
    const updated = [...flowchartSteps];

    if (field.startsWith("pelaksana.")) {
      const pelaksanaKey = field.split(".")[1];
      updated[index].pelaksana[pelaksanaKey] = value;
    } else if (field.startsWith("shapes.")) {
      const pelaksanaKey = field.split(".")[1];
      updated[index].shapes[pelaksanaKey] = value;
    } else if (field.startsWith("mutuBaku.")) {
      const mutuBakuKey = field.split(".")[1] as keyof typeof updated[0]["mutuBaku"];
      updated[index].mutuBaku[mutuBakuKey] = value;
    } else {
      (updated[index] as any)[field] = value;
    }

    setFlowchartSteps(updated);
  };

  // ===== AI & SAVE HANDLERS =====
  const generateAISuggestion = async () => {
    if (!formData.title) {
      toast.error("Masukkan judul SOP terlebih dahulu!");
      return;
    }
    setIsGenerating(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/generate_sop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: formData.title }),
      });
      if (!response.ok) throw new Error("Gagal ambil dari backend");
      const data = await response.json();
      setAiSuggestion(data.steps || "Tidak ada hasil AI.");
    } catch (err) {
      console.error(err);
      toast.error("Gagal terhubung ke backend. Pastikan FastAPI aktif!");
    } finally {
      setIsGenerating(false);
    }
  };

  const useAISuggestion = () => {
    setFormData((prev) => ({ ...prev, description: aiSuggestion }));
    setAiSuggestion("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('File harus berformat PDF');
        return;
      }
      setUploadedFile(selectedFile);
      toast.success(`File ${selectedFile.name} berhasil dipilih`);
    }
  };

  const handleUploadInputChange = (field: string, value: string) => {
    setUploadFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleUploadSubmit = async (isDraft: boolean = true) => {
    if (!uploadedFile) {
      toast.error("Pilih file PDF terlebih dahulu!");
      return;
    }

    if (!uploadFormData.title || !uploadFormData.department) {
      toast.error("Judul SOP dan Tim harus diisi!");
      return;
    }

    setIsSaving(true);

    try {
      const token = getAuthToken();
      if (!token) {
        toast.error("Silakan login terlebih dahulu!");
        setIsSaving(false);
        return;
      }

      // Convert PDF to base64
      const base64Pdf = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(uploadedFile);
      });

      const sopData = {
        code: uploadFormData.code || `SOP-${Date.now()}`,
        title: uploadFormData.title,
        description: uploadFormData.description || "-",
        department: uploadFormData.department,
        responsible_person: uploadFormData.responsiblePerson || "-",
        status: isDraft ? "draft" : "aktif",
        effective_date: uploadFormData.effectiveDate || new Date().toISOString().split('T')[0],
        expiry_date: uploadFormData.expiryDate || null,
        file_base64: base64Pdf,
      };

      const response = await fetch(`${API_URL}/api/sops`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(sopData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        // Tampilkan error spesifik
        if (errorData.detail?.includes("already exists")) {
          throw new Error("Kode SOP sudah ada, gunakan kode lain!");
        }
        
        throw new Error(errorData.detail || "Failed to create SOP");
      }

      toast.success(`✅ SOP berhasil ${isDraft ? 'disimpan sebagai draft' : 'dipublikasikan'}!`);
      setShowSuccess(true);

      // Reset form
      setTimeout(() => {
        setUploadFormData({
          code: "",
          title: "",
          department: "",
          responsiblePerson: "",
          effectiveDate: "",
          expiryDate: "",
          description: "",
          status: "draft"
        });
        setUploadedFile(null);
        setShowSuccess(false);
        
        const fileInput = document.getElementById('pdf-file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }, 2000);

    } catch (error: any) {
      console.error("❌ Error uploading SOP:", error);
      toast.error(`Gagal upload SOP: ${error.message || error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (isDraft: boolean = true) => {
    setIsSaving(true);

    try {
      // 1. Validasi user login
      const token = getAuthToken();
      if (!token) {
        toast.error("Silakan login terlebih dahulu!");
        setIsSaving(false);
        return;
      }

      // 2. Validasi form
      if (!formData.title || !formData.department) {
        toast.error("Judul SOP dan Tim harus diisi!");
        setIsSaving(false);
        return;
      }

      console.log("🔄 Generating PDF...");

      // 3. Generate PDF
      const pdfBytes = await generateSOPPdf({
        nomor: formData.code || `SOP-${Date.now()}`,
        namaSop: formData.title,
        tanggalPembuatan: formatDate(formData.tanggalPembuatan),
        tanggalRevisi: formatDate(formData.tanggalRevisi),
        tanggalEfektif: formatDate(formData.tanggalEfektif),
        dasarHukum: formData.dasarHukum,
        kualifikasiPelaksana: formData.kualifikasiPelaksana,
        keterkaitan: formData.keterkaitan,
        peralatanPerlengkapan: formData.peralatanPerlengkapan,
        peringatan: formData.peringatan,
        pencatatanPendataan: formData.pencatatanPendataan,
        maksud: formData.maksud,
        tujuan: formData.tujuan,
        flowchartSteps: flowchartSteps,
        pelaksanaColumns: pelaksanaColumns,
        customShapeImages: customShapeImages,
        finalAction: finalAction,
      });

      console.log("📄 PDF generated:", pdfBytes.length, "bytes");

      // 4. Convert PDF to base64 (lebih mudah untuk database)
      const base64Pdf = btoa(
        new Uint8Array(pdfBytes).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      // 5. Prepare JSON data (BUKAN FormData)
      const sopData = {
        code: formData.code || `SOP-${Date.now()}`,
        title: formData.title,
        description: formData.description || "-",
        department: formData.department,
        responsible_person: formData.responsiblePerson || "-",
        status: isDraft ? "draft" : "aktif",
        effective_date: formData.effectiveDate || new Date().toISOString().split('T')[0],
        expiry_date: formData.expiryDate || null,
        file_base64: base64Pdf, // ✅ Kirim sebagai base64
        // Data tambahan untuk COP
        tanggal_pembuatan: formData.tanggalPembuatan || null,
        tanggal_revisi: formData.tanggalRevisi || null,
        tanggal_efektif: formData.tanggalEfektif || null,
        dasar_hukum: formData.dasarHukum || null,
        kualifikasi_pelaksana: formData.kualifikasiPelaksana || null,
        keterkaitan: formData.keterkaitan || null,
        peralatan_perlengkapan: formData.peralatanPerlengkapan || null,
        peringatan: formData.peringatan || null,
        pencatatan_pendataan: formData.pencatatanPendataan || null,
        maksud: formData.maksud || null,
        tujuan: formData.tujuan || null,
        flowchart_steps: JSON.stringify(flowchartSteps), // ✅ Convert ke JSON string
        pelaksana_columns: JSON.stringify(pelaksanaColumns), // ✅ Convert ke JSON string
      };

      console.log("📤 Uploading to backend...");

      // 6. Send to backend
      const response = await fetch(`${API_URL}/api/sops`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(sopData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create SOP");
      }

      const result = await response.json();
      console.log("✅ Upload successful:", result);

      setShowSuccess(true);
      toast.success(`✅ SOP berhasil ${isDraft ? 'disimpan sebagai draft' : 'dipublikasikan'}!`);

      // 7. Reset form after 2s
      setTimeout(() => {
        setFormData({
          code: "",
          tanggalPembuatan: "",
          tanggalRevisi: "",
          tanggalEfektif: "",
          title: "",
          department: "",
          responsiblePerson: "",
          dasarHukum: "",
          kualifikasiPelaksana: "",
          keterkaitan: "",
          peralatanPerlengkapan: "",
          peringatan: "",
          pencatatanPendataan: "",
          maksud: "",
          tujuan: "",
          description: "",
          effectiveDate: "",
          expiryDate: "",
        });
        setFlowchartSteps([{
          no: 1,
          aktivitas: "",
          pelaksana: Object.fromEntries(pelaksanaColumns.map(col => [col, false])),
          mutuBaku: { persyaratan: "", output: "", waktu: "" },
          keterangan: "",
        shapes: Object.fromEntries(pelaksanaColumns.map(col => [col, "auto"])),
        }]);
        setShowSuccess(false);
        
        // Optional: Navigate to SOP list
        // navigate('/sop-documents');
      }, 2000);

    } catch (error: any) {
      console.error("❌ Error saving SOP:", error);
      toast.error(`Gagal menyimpan SOP: ${error.message || error}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPDF = async () => {
    try {
      toast.info("🔄 Generating test PDF...");

      const pdfBytes: Uint8Array = await generateSOPPdf({
        nomor: formData.code || "TEST-001",
        namaSop: formData.title || "SOP",
        tanggalPembuatan: formatDate(formData.tanggalPembuatan) || formatDate(new Date().toISOString().split("T")[0]),
        tanggalRevisi: formatDate(formData.tanggalRevisi),
        tanggalEfektif: formatDate(formData.tanggalEfektif) || formatDate(new Date().toISOString().split("T")[0]),
        dasarHukum: formData.dasarHukum || "-",
        kualifikasiPelaksana: formData.kualifikasiPelaksana || "-",
        keterkaitan: formData.keterkaitan || "-",
        peralatanPerlengkapan: formData.peralatanPerlengkapan || "-",
        peringatan: formData.peringatan || "-",
        pencatatanPendataan: formData.pencatatanPendataan || "-",
        maksud: formData.maksud || "-",
        tujuan: formData.tujuan || "-",
        flowchartSteps: flowchartSteps,
        pelaksanaColumns: pelaksanaColumns,
        customShapeImages: customShapeImages,
        finalAction: finalAction,
      });

      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");

      toast.success("PDF berhasil ditampilkan!");
    } catch (err: any) {
      console.error("❌ PDF Error:", err);
      toast.error(`PDF Error: ${err.message}`);
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex overflow-hidden">
      <aside className="fixed left-0 top-0 h-full w-64 z-30">
        <Sidebar activeMenu="create" />
      </aside>

      <div className="ml-64 flex-1 flex flex-col relative z-10">
        <Header />

        <main className="flex-1 overflow-y-auto scroll-smooth p-6">
          {/* Header - Keep existing */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Buat SOP Baru
              </h1>
                {/* <Badge className="flex items-center gap-1 bg-gradient-to-r from-purple-500 to-blue-500 text-white border-none">
                  <Sparkles className="h-3 w-3" /> AI Assisted
                </Badge> */}
            </div>
            <p className="text-gray-600">
              Buat dokumen SOP baru sesuai template BPS Kota Surabaya
            </p>
          </div>

          {showSuccess && (
            <Alert className="mb-6 border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
              <AlertDescription className="text-green-800 font-medium">
                ✨ SOP berhasil disimpan! Data telah ditambahkan ke sistem.
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate">
                <FileText className="h-4 w-4 mr-2" />
                Generate PDF dari Form
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4 mr-2" />
                Upload PDF Manual
              </TabsTrigger>
            </TabsList>

            {/* ===== TAB GENERATE PDF ===== */}
            <TabsContent value="generate">
              <div className="space-y-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* ===== CARD 1: INFORMASI HEADER COP ===== */}
                  <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-blue-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        Informasi Header COP
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                        <div>
                          <Label htmlFor="code" className="text-sm font-medium text-gray-700">Nomor SOP</Label>
                          <Input
                            id="code"
                            placeholder="Contoh: SOP/001/2025"
                            value={formData.code}
                            onChange={(e) => handleInputChange("code", e.target.value)}
                            className="mt-1.5 h-10"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="tanggalPembuatan" className="text-sm font-medium text-gray-700">Tanggal Pembuatan</Label>
                          <Input
                            id="tanggalPembuatan"
                            type="date"
                            value={formData.tanggalPembuatan}
                            onChange={(e) => handleInputChange("tanggalPembuatan", e.target.value)}
                            className="mt-1.5 h-10"
                          />
                        </div>

                        <div>
                          <Label htmlFor="tanggalRevisi" className="text-sm font-medium text-gray-700">Tanggal Revisi</Label>
                          <Input
                            id="tanggalRevisi"
                            type="date"
                            value={formData.tanggalRevisi}
                            onChange={(e) => handleInputChange("tanggalRevisi", e.target.value)}
                            className="mt-1.5 h-10"
                          />
                        </div>

                        <div>
                          <Label htmlFor="tanggalEfektif" className="text-sm font-medium text-gray-700">Tanggal Efektif</Label>
                          <Input
                            id="tanggalEfektif"
                            type="date"
                            value={formData.tanggalEfektif}
                            onChange={(e) => handleInputChange("tanggalEfektif", e.target.value)}
                            className="mt-1.5 h-10"
                          />
                        </div>
                      </div>

                      <div className="pt-1">
                        <Label htmlFor="title" className="text-sm font-medium text-gray-700">Nama SOP</Label>
                        <Input
                          id="title"
                          placeholder="Masukkan nama/judul SOP"
                          value={formData.title}
                          onChange={(e) => handleInputChange("title", e.target.value)}
                          className="mt-1.5 h-10"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* ===== CARD 2: INFORMASI TAMBAHAN ===== */}
                  <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-indigo-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-600" />
                        Informasi Tambahan
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-6">
                        <div>
                          <Label htmlFor="department" className="text-sm font-medium text-gray-700">Tim</Label>
                          <Select
                            value={formData.department}
                            onValueChange={(value) => handleInputChange("department", value)}
                          >
                            <SelectTrigger className="mt-1.5 h-10">
                              <SelectValue placeholder="Pilih Tim/Department" />
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

                        <div>
                          <Label htmlFor="responsiblePerson" className="text-sm font-medium text-gray-700">Penanggung Jawab</Label>
                          <Input
                            id="responsiblePerson"
                            placeholder="Nama penanggung jawab..."
                            value={formData.responsiblePerson}
                            onChange={(e) => handleInputChange("responsiblePerson", e.target.value)}
                            className="mt-1.5 h-10"
                          />
                        </div>

                        <div>
                          <Label htmlFor="effectiveDate" className="text-sm font-medium text-gray-700">Tanggal Berlaku</Label>
                          <Input
                            id="effectiveDate"
                            type="date"
                            value={formData.effectiveDate}
                            onChange={(e) => handleInputChange("effectiveDate", e.target.value)}
                            className="mt-1.5 h-10"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ===== CARD 3: DETAIL INFORMASI COP ===== */}
                  <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-purple-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-purple-600" />
                        Detail Informasi COP
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        {/* Column 1 */}
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="dasarHukum" className="text-sm font-medium text-gray-700">Dasar Hukum</Label>
                            <Textarea
                              id="dasarHukum"
                              rows={3}
                              placeholder="Masukkan dasar hukum..."
                              value={formData.dasarHukum}
                              onChange={(e) => handleInputChange("dasarHukum", e.target.value)}
                              className="mt-1.5 resize-none text-sm"
                            />
                          </div>

                          <div>
                            <Label htmlFor="keterkaitan" className="text-sm font-medium text-gray-700">Keterkaitan</Label>
                            <Textarea
                              id="keterkaitan"
                              rows={3}
                              placeholder="Masukkan keterkaitan dengan SOP lain..."
                              value={formData.keterkaitan}
                              onChange={(e) => handleInputChange("keterkaitan", e.target.value)}
                              className="mt-1.5 resize-none text-sm"
                            />
                          </div>

                          <div>
                            <Label htmlFor="peringatan" className="text-sm font-medium text-gray-700">Peringatan</Label>
                            <Textarea
                              id="peringatan"
                              rows={3}
                              placeholder="Masukkan peringatan penting..."
                              value={formData.peringatan}
                              onChange={(e) => handleInputChange("peringatan", e.target.value)}
                              className="mt-1.5 resize-none text-sm"
                            />
                          </div>
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="kualifikasiPelaksana" className="text-sm font-medium text-gray-700">Kualifikasi Pelaksana</Label>
                            <Textarea
                              id="kualifikasiPelaksana"
                              rows={3}
                              placeholder="Masukkan kualifikasi pelaksana..."
                              value={formData.kualifikasiPelaksana}
                              onChange={(e) => handleInputChange("kualifikasiPelaksana", e.target.value)}
                              className="mt-1.5 resize-none text-sm"
                            />
                          </div>

                          <div>
                            <Label htmlFor="peralatanPerlengkapan" className="text-sm font-medium text-gray-700">Peralatan/Perlengkapan</Label>
                            <Textarea
                              id="peralatanPerlengkapan"
                              rows={3}
                              placeholder="Masukkan peralatan yang diperlukan..."
                              value={formData.peralatanPerlengkapan}
                              onChange={(e) => handleInputChange("peralatanPerlengkapan", e.target.value)}
                              className="mt-1.5 resize-none text-sm"
                            />
                          </div>

                          <div>
                            <Label htmlFor="pencatatanPendataan" className="text-sm font-medium text-gray-700">Pencatatan & Pendataan</Label>
                            <Textarea
                              id="pencatatanPendataan"
                              rows={3}
                              placeholder="Masukkan pencatatan dan pendataan..."
                              value={formData.pencatatanPendataan}
                              onChange={(e) => handleInputChange("pencatatanPendataan", e.target.value)}
                              className="mt-1.5 resize-none text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ===== CARD 4: MAKSUD DAN TUJUAN ===== */}
                  <Card className="bg-white/80 backdrop-blur-md shadow-xl border border-green-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-600" />
                        Maksud dan Tujuan
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="maksud" className="text-sm font-medium text-gray-700">Maksud</Label>
                        <Textarea
                          id="maksud"
                          rows={3}
                          placeholder="Jelaskan maksud dari SOP ini..."
                          value={formData.maksud}
                          onChange={(e) => handleInputChange("maksud", e.target.value)}
                          className="mt-1.5 resize-none text-sm"
                        />
                      </div>

                      <div>
                        <Label htmlFor="tujuan" className="text-sm font-medium text-gray-700">Tujuan</Label>
                        <Textarea
                          id="tujuan"
                          rows={3}
                          placeholder="Jelaskan tujuan dari SOP ini..."
                          value={formData.tujuan}
                          onChange={(e) => handleInputChange("tujuan", e.target.value)}
                          className="mt-1.5 resize-none text-sm"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* FLOWCHART SECTION */}
                  <Card className="bg-white/80 backdrop-blur-md shadow-2xl">
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-xl flex items-center gap-2">
                          <Workflow className="h-5 w-5" />
                          Tabel Prosedur (Flowchart)
                        </CardTitle>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowFlowchart(!showFlowchart)}
                        >
                          {showFlowchart ? "Sembunyikan" : "Tampilkan"}
                        </Button>
                      </div>
                    </CardHeader>

                    {showFlowchart && (
                      <CardContent className="space-y-6">
                        {/* Manage Pelaksana Columns */}
                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <Label className="font-semibold mb-2 block">Kelola Kolom Pelaksana</Label>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {pelaksanaColumns.map((col) => (
                              <Badge key={col} variant="secondary" className="gap-1">
                                {col}
                                <button
                                  onClick={() => removePelaksanaColumn(col)}
                                  className="ml-1 hover:text-red-600"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Nama kolom pelaksana baru..."
                              value={newPelaksanaName}
                              onChange={(e) => setNewPelaksanaName(e.target.value)}
                              onKeyPress={(e) => e.key === "Enter" && addPelaksanaColumn()}
                            />
                            <Button size="sm" onClick={addPelaksanaColumn}>
                              <Plus className="h-4 w-4 mr-1" /> Tambah
                            </Button>
                          </div>
                        </div>

                        {/* Flowchart Steps */}
                        <div className="space-y-4">
                          {flowchartSteps.map((step, index) => (
                            <Card key={index} className="border-2">
                              <CardContent className="pt-4">
                                <div className="flex justify-between items-start mb-4">
                                  <Badge variant="outline">Langkah {step.no}</Badge>
                                  <div className="flex gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moveStepUp(index)}
                                      disabled={index === 0}
                                    >
                                      <MoveUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => moveStepDown(index)}
                                      disabled={index === flowchartSteps.length - 1}
                                    >
                                      <MoveDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeFlowchartStep(index)}
                                      className="text-red-600"
                                      disabled={flowchartSteps.length === 1}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid gap-4">
                                  {/* Aktivitas */}
                                  <div>
                                    <Label className="text-xs font-semibold">Aktivitas</Label>
                                    <Textarea
                                      rows={2}
                                      placeholder="Deskripsi aktivitas..."
                                      value={step.aktivitas}
                                      onChange={(e) =>
                                        updateFlowchartStep(index, "aktivitas", e.target.value)
                                      }
                                    />
                                  </div>

                                  {/* Pelaksana (Dynamic Checkboxes) with per-executor shapes */}
                                  <div>
                                    <Label className="text-xs font-semibold">Pelaksana & Bentuk Simbol</Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                                      {pelaksanaColumns.map((pel) => (
                                        <div key={pel} className="flex flex-col gap-2 p-3 border rounded-lg bg-gray-50/50">
                                          <div className="flex items-center space-x-2">
                                            <input
                                              type="checkbox"
                                              id={`step-${index}-pel-${pel}`}
                                              checked={step.pelaksana[pel] || false}
                                              onChange={(e) =>
                                                updateFlowchartStep(
                                                  index,
                                                  `pelaksana.${pel}`,
                                                  e.target.checked
                                                )
                                              }
                                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <Label
                                              htmlFor={`step-${index}-pel-${pel}`}
                                              className="text-xs font-medium cursor-pointer"
                                            >
                                              {pel}
                                            </Label>
                                          </div>
                                          
                                          {step.pelaksana[pel] && (
                                            <div className="mt-1 pl-6">
                                              <Label className="text-[10px] text-gray-500 mb-1 block uppercase font-bold">Bentuk Simbol</Label>
                                              <Select
                                                value={step.shapes[pel] || "auto"}
                                                onValueChange={(val) => updateFlowchartStep(index, `shapes.${pel}`, val)}
                                              >
                                                <SelectTrigger className="h-7 text-[10px] bg-white">
                                                  <SelectValue placeholder="Bentuk" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="auto">Otomatis</SelectItem>
                                                  <SelectItem value="oval">Mulai/Selesai (Oval)</SelectItem>
                                                  <SelectItem value="rectangle">Proses (Kotak)</SelectItem>
                                                  <SelectItem value="diamond">Keputusan (Belah Ketupat)</SelectItem>
                                                  <SelectItem value="parallelogram">Data (Jajar Genjang)</SelectItem>
                                                  <SelectItem value="document">Dokumen</SelectItem>
                                                  <SelectItem value="custom">Gambar Kustom</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Custom image upload shown only when "custom" is selected for any pelaksana */}
                                  {Object.values(step.shapes).includes("custom") && (
                                    <div className="mt-2 flex flex-col gap-1">
                                      <Label className="text-xs text-gray-500">Upload gambar bentuk (PNG/JPG):</Label>
                                      <input
                                        type="file"
                                        accept="image/png,image/jpeg"
                                        className="text-xs"
                                        onChange={async (e) => {
                                          const file = e.target.files?.[0];
                                          if (!file) return;
                                          const buf = await file.arrayBuffer();
                                          setCustomShapeImages(prev => ({ ...prev, [index]: new Uint8Array(buf) }));
                                          toast.success(`Gambar "${file.name}" berhasil dimuat untuk langkah ${index + 1}!`);
                                        }}
                                      />
                                      {customShapeImages[index] && (
                                        <span className="text-xs text-green-600">✅ Gambar kustom dimuat</span>
                                      )}
                                    </div>
                                  )}

                                  {/* Mutu Baku */}
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <Label className="text-xs font-semibold">
                                        Persyaratan/Kelengkapan
                                      </Label>
                                      <Input
                                        placeholder="Rincian Biaya..."
                                        value={step.mutuBaku.persyaratan}
                                        onChange={(e) =>
                                          updateFlowchartStep(
                                            index,
                                            "mutuBaku.persyaratan",
                                            e.target.value
                                          )
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-semibold">Output</Label>
                                      <Input
                                        placeholder="Database RKAKL..."
                                        value={step.mutuBaku.output}
                                        onChange={(e) =>
                                          updateFlowchartStep(index, "mutuBaku.output", e.target.value)
                                        }
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-semibold">Waktu</Label>
                                      <Input
                                        placeholder="5 menit..."
                                        value={step.mutuBaku.waktu}
                                        onChange={(e) =>
                                          updateFlowchartStep(index, "mutuBaku.waktu", e.target.value)
                                        }
                                      />
                                    </div>
                                  </div>

                                  {/* Keterangan */}
                                  <div>
                                    <Label className="text-xs font-semibold">Keterangan</Label>
                                    <Input
                                      placeholder="Keterangan tambahan..."
                                      value={step.keterangan}
                                      onChange={(e) =>
                                        updateFlowchartStep(index, "keterangan", e.target.value)
                                      }
                                    />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          <Button variant="outline" className="w-full" onClick={addFlowchartStep}>
                            <Plus className="h-4 w-4 mr-2" />
                            Tambah Langkah Baru
                          </Button>
                        </div>
                      </CardContent>
                    )}
                  </Card>

                  {/* Action Buttons */}
                  <Card className="bg-white/80 backdrop-blur-md shadow-2xl overflow-visible">
                    <CardContent className="pt-6">
                      {/* Opsi Aksi Lanjutan di Akhir Flowchart - Moved outside steps card */}
                      <div className="mb-6 pb-6 border-b border-gray-100">
                        <Label className="text-sm font-bold mb-3 block text-blue-700">
                          🏁 Aksi Lanjutan di Akhir Flowchart
                        </Label>
                        <select 
                          className="w-full bg-white border border-gray-200 rounded-md h-11 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm cursor-pointer"
                          value={finalAction || "none"} 
                          onChange={(e) => setFinalAction(e.target.value)}
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 0.75rem center',
                            backgroundSize: '1rem'
                          }}
                        >
                          <option value="none">Selesai (Tidak ada diagram lanjutan)</option>
                          <option value="organisasi">Lanjut ke Diagram Organisasi</option>
                          <option value="workflow">Lanjut ke Alur Kerja (Workflow)</option>
                          <option value="lainnya">Lanjut ke Diagram Lainnya</option>
                        </select>
                      </div>

                      <div className="flex gap-3 flex-wrap">
                        <Button variant="outline" disabled={isSaving} onClick={() => handleSave(true)}>
                          <Save className="h-4 w-4 mr-1" />
                          Simpan Draft
                        </Button>
                        <Button
                          onClick={() => handleSave(false)}
                          disabled={isSaving}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                        >
                          {isSaving ? (
                            <>
                              <span className="animate-spin mr-2">⏳</span>
                              Menyimpan...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-1" />
                              Publikasikan SOP
                            </>
                          )}
                        </Button>
                        <Button variant="outline" onClick={handleTestPDF}>
                          🧪 Test PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* ===== TAB UPLOAD PDF ===== */}
            <TabsContent value="upload">
              <Card className="bg-white/80 backdrop-blur-md shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5 text-blue-600" />
                    Upload PDF SOP Manual
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* File Upload */}
                  <div>
                    <Label htmlFor="pdf-file-upload">File PDF *</Label>
                    <Input
                      id="pdf-file-upload"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="mt-1.5"
                    />
                    {uploadedFile && (
                      <div className="flex items-center gap-2 text-sm text-green-600 mt-2">
                        <CheckCircle className="h-4 w-4" />
                        {uploadedFile.name}
                      </div>
                    )}
                  </div>

                  {/* Form fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="upload-code">Kode SOP</Label>
                      <Input
                        id="upload-code"
                        placeholder="SOP/001/2025"
                        value={uploadFormData.code}
                        onChange={(e) => handleUploadInputChange("code", e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="upload-title">Judul SOP *</Label>
                      <Input
                        id="upload-title"
                        placeholder="Nama SOP"
                        value={uploadFormData.title}
                        onChange={(e) => handleUploadInputChange("title", e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="upload-department">Tim *</Label>
                      <Select
                        value={uploadFormData.department}
                        onValueChange={(value) => handleUploadInputChange("department", value)}
                      >
                        <SelectTrigger className="mt-1.5">
                          <SelectValue placeholder="Pilih Tim" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="upload-responsible">Penanggung Jawab</Label>
                      <Input
                        id="upload-responsible"
                        value={uploadFormData.responsiblePerson}
                        onChange={(e) => handleUploadInputChange("responsiblePerson", e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="upload-effective">Tanggal Berlaku *</Label>
                      <Input
                        id="upload-effective"
                        type="date"
                        value={uploadFormData.effectiveDate}
                        onChange={(e) => handleUploadInputChange("effectiveDate", e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="upload-expiry">Tanggal Kadaluarsa</Label>
                      <Input
                        id="upload-expiry"
                        type="date"
                        value={uploadFormData.expiryDate}
                        onChange={(e) => handleUploadInputChange("expiryDate", e.target.value)}
                        className="mt-1.5"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="upload-description">Deskripsi</Label>
                    <Textarea
                      id="upload-description"
                      rows={4}
                      value={uploadFormData.description}
                      onChange={(e) => handleUploadInputChange("description", e.target.value)}
                      className="mt-1.5"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" disabled={isSaving} onClick={() => handleUploadSubmit(true)}>
                      <Save className="h-4 w-4 mr-1" />
                      Simpan Draft
                    </Button>
                    <Button
                      onClick={() => handleUploadSubmit(false)}
                      disabled={isSaving}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                    >
                      <Send className="h-4 w-4 mr-1" />
                      Publikasikan SOP
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>

        <Footer />
      </div>
    </div>
  );
}