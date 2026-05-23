import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthService } from "@/lib/auth";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import Footer from "@/components/layout/Footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, Download } from "lucide-react";
import axios from "axios";

const API_URL = "http://localhost:8000";

export default function EditPDF() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sop, setSop] = useState<any>(null);
  const [oldText, setOldText] = useState("");
  const [newText, setNewText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalPdfUrl, setOriginalPdfUrl] = useState<string | null>(null);

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

      const response = await axios.get(`${API_URL}/api/sops/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("✅ SOP data received:", response.data);

      const sopData = response.data;
      setSop(sopData);

      // ✅ PERBAIKAN: Fetch PDF sebagai blob untuk preview
      if (sopData.file_url) {
        console.log("📥 Fetching PDF for preview...");
        
        const pdfResponse = await axios.get(
          `${API_URL}/api/sops/${id}/download`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            responseType: "blob",
          }
        );

        const blob = pdfResponse.data;
        const blobUrl = URL.createObjectURL(blob);
        setOriginalPdfUrl(blobUrl);
        
        console.log("✅ PDF loaded as blob URL");
      }

      setLoading(false);
    } catch (error: any) {
      console.error("❌ Error fetching SOP:", error);
      
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        AuthService.logout();
        navigate("/login");
      } else if (error.response?.status === 404) {
        toast.error("SOP tidak ditemukan!");
        navigate("/management");
      } else {
        toast.error("Gagal memuat data SOP");
      }
      
      setLoading(false);
    }
  };

  const handleEditPDF = async () => {
    if (!sop?.file_url) {
      toast.error("File SOP tidak ditemukan!");
      return;
    }
    if (!oldText || !newText) {
      toast.error("Masukkan teks lama dan teks pengganti!");
      return;
    }

    setIsProcessing(true);

    try {
      const token = AuthService.getToken();

      if (!token) {
        toast.error("Session expired. Please login again.");
        navigate("/login");
        return;
      }

      // 1. Download PDF file dari backend
      console.log("📥 Downloading original PDF...");
      const pdfResponse = await axios.get(
        `${API_URL}/api/sops/${id}/download`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob", // Important untuk file
        }
      );

      const pdfBlob = pdfResponse.data;
      console.log("✅ PDF downloaded, size:", pdfBlob.size, "bytes");

      // 2. Kirim ke endpoint edit-pdf
      const formData = new FormData();
      formData.append("file", pdfBlob, `${sop.code}.pdf`);
      formData.append("old_text", oldText);
      formData.append("new_text", newText);

      console.log("🔄 Sending to edit-pdf endpoint...");

      const editResponse = await fetch(`${API_URL}/edit-pdf/`, {
        method: "POST",
        body: formData,
      });

      if (!editResponse.ok) {
        const err = await editResponse.json().catch(() => ({}));
        toast.error(err.message || "Gagal mengedit PDF");
        setIsProcessing(false);
        return;
      }

      // 3. Tampilkan hasil revisi
      const revisedBlob = await editResponse.blob();
      const revisedUrl = URL.createObjectURL(revisedBlob);
      setPreviewUrl(revisedUrl);

      toast.success("✅ PDF berhasil direvisi!");
    } catch (error: any) {
      console.error("❌ Gagal edit PDF:", error);
      
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        AuthService.logout();
        navigate("/login");
      } else {
        toast.error("Terjadi kesalahan saat memproses PDF");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadRevised = () => {
    if (!previewUrl) return;
    
    const link = document.createElement("a");
    link.href = previewUrl;
    link.download = `${sop?.code}_revised.pdf`;
    link.click();
    
    toast.success("PDF hasil revisi berhasil diunduh!");
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

  if (!sop) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        SOP tidak ditemukan
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
      <div className="ml-64 flex-1 flex flex-col">
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
              Edit PDF: {sop.title}
            </h1>
            <p className="text-gray-600">Kode: {sop.code}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 🧾 PDF Asli */}
            <Card className="bg-white/80 backdrop-blur-md shadow-lg border border-blue-200">
              <CardHeader>
                <CardTitle>PDF Asli</CardTitle>
              </CardHeader>
              <CardContent>
                {originalPdfUrl ? (
                  <iframe
                    src={originalPdfUrl}
                    className="w-full h-[500px] border rounded-lg"
                    title="Original PDF"
                  />
                ) : (
                  <div className="w-full h-[500px] flex items-center justify-center border rounded-lg bg-gray-50">
                    <p className="text-gray-500">PDF tidak tersedia</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ✏️ Form Edit */}
            <Card className="bg-white/80 backdrop-blur-md shadow-lg border border-purple-200">
              <CardHeader>
                <CardTitle>Edit Isi PDF</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="font-semibold text-gray-700 text-sm block mb-1.5">
                    Teks Lama (yang ingin diganti)
                  </label>
                  <Input
                    placeholder="Contoh: 2025"
                    value={oldText}
                    onChange={(e) => setOldText(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Masukkan teks yang ada di PDF yang ingin diganti
                  </p>
                </div>

                <div>
                  <label className="font-semibold text-gray-700 text-sm block mb-1.5">
                    Ganti Dengan
                  </label>
                  <Input
                    placeholder="Contoh: 2026"
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Masukkan teks pengganti
                  </p>
                </div>

                <Button
                  onClick={handleEditPDF}
                  disabled={isProcessing || !oldText || !newText}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Memproses...
                    </>
                  ) : (
                    "✏️ Edit PDF Sekarang"
                  )}
                </Button>

                {previewUrl && (
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => window.open(previewUrl, "_blank")}
                    >
                      👁️ Lihat Hasil Revisi
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleDownloadRevised}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF Hasil Revisi
                    </Button>
                  </div>
                )}

                <Button
                  variant="ghost"
                  onClick={() => navigate(`/edit/${id}`)}
                  className="w-full"
                >
                  ← Kembali ke Edit Data
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Preview hasil revisi */}
          {previewUrl && (
            <div className="mt-10">
              <Card className="bg-white/80 backdrop-blur-md shadow-lg border border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    ✅ Preview PDF Hasil Revisi
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <iframe
                    src={previewUrl}
                    className="w-full h-[600px] border rounded-lg"
                    title="Revised PDF"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </main>

        <Footer />
      </div>
    </div>
  );
}